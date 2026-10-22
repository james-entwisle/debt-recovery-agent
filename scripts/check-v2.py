#!/usr/bin/env python3
"""Exercise conversation, scoped demo auth and resumable drafts over real HTTP.

Runs against the direct API or Next.js proxy. Tokens are kept in memory and never
printed. Account and payment effects are synthetic. Run check-demo.py as well.
"""
import http.cookiejar
import json
import os
import uuid
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE = os.environ.get("API_BASE_URL", "http://127.0.0.1:4000").rstrip("/")


class Client:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.http = build_opener(HTTPCookieProcessor(self.cookies))

    def request(self, path, body=None, expected=200):
        data = None if body is None else json.dumps(body).encode()
        req = Request(BASE + path, data=data,
                      headers={"Content-Type": "application/json"})
        try:
            with self.http.open(req, timeout=15) as response:
                status, result = response.status, json.load(response)
        except HTTPError as error:
            status, result = error.code, json.load(error)
        accepted = {expected} if isinstance(expected, int) else set(expected)
        # Do not include request body in failure output: it may contain a token.
        assert status in accepted, (path, status, result.get("error", "unexpected response"))
        return result


operator = Client()


def open_session(scenario="S04"):
    return operator.request("/sessions", {"scenario_id": scenario, "arm": "treatment"})["view"]


def command(view, payload, client=operator, action_id=None, expected=200):
    path = "/sessions/" + view["session_id"] + "/commands"
    if action_id:
        path = "/jit/" + view["session_id"] + "/" + action_id + "/commands"
    result = client.request(path, {"command_id": str(uuid.uuid4()), "command": payload}, expected)
    return result.get("view", result)


def create_action(view, state):
    next_view = command(view, {"type": "create_jit", "state": state})
    action = next_view["conversation"]["jit_actions"][-1]
    return next_view, action["id"]


def issue(view, action_id):
    return operator.request("/sessions/" + view["session_id"] + "/jit-links", {"action_id": action_id})


def verify(client, view, action_id, link, expected=200):
    return client.request("/jit/verify", {
        "session_id": view["session_id"], "action_id": action_id, "token": link["token"],
    }, expected)


def main():
    view = open_session()
    initial_contacts = len(view["contacts"])
    view = command(view, {"type": "receive_sms", "text": "I get paid every second Friday"})
    assert view["preferences"]["frequency"] == "fortnightly"
    assert view["conversation"]["jit_actions"]
    view = command(view, {"type": "receive_sms", "text": "Yes, around $50"})
    assert view["preferences"]["frequency"] == "fortnightly"
    assert view["preferences"]["max_instalment_usd"] == 50
    assert len(view["contacts"]) == initial_contacts, "Inbound messages must not add proactive contacts"
    assert not any(option["matches"] for option in view["portal"]["options"])
    assert len([m for m in view["conversation"]["messages"] if m["direction"] == "inbound"]) == 2
    print("PASS multi-turn SMS: payday memory, amount preference and immutable approved terms")

    intents = set()
    for text in ["Who is this creditor?", "I don't recognise this debt.",
                 "I'm struggling with money at the moment.",
                 "I started setting up a plan yesterday but got interrupted.",
                 "I've already paid."]:
        case = command(open_session(), {"type": "receive_sms", "text": text})
        intents.add(case["conversation"]["last_intent"])
        assert not case["confirmed_plan"] and not case["payment"]
        if "recognise" in text or "struggling" in text:
            assert case["conversation"]["decision"]["escalation_required"]
            assert case["account"]["holds"] == [], "Classifier cannot apply formal holds"
    assert len(intents) == 5, intents
    print("PASS distinct intent routing: account question, dispute, hardship, interruption, reported payment")

    stopped = command(open_session(), {"type": "receive_sms", "text": "STOP"})
    assert stopped["account"]["sms_allowed"] is False
    assert stopped["decision"]["outcome"] == "SUPPRESS"
    print("PASS STOP: source permissions and proactive policy update")

    view, action_id = create_action(open_session(), "draft")
    path = "/jit/" + view["session_id"] + "/" + action_id
    consumer = Client()
    consumer.request(path, expected=(401, 403))
    link = issue(view, action_id)
    same_account, wrong_purpose = create_action(view, "help")
    verify(Client(), same_account, wrong_purpose, link, expected=401)
    other, other_id = create_action(open_session(), "draft")
    verify(Client(), other, other_id, link, expected=(401, 403, 422))
    result = verify(consumer, view, action_id, link)
    scoped = result["view"]
    assert any(cookie.has_nonstandard_attr("HttpOnly") for cookie in consumer.cookies), "Expected HttpOnly demo auth cookie"
    assert any(cookie.get_nonstandard_attr("SameSite") == "Strict" for cookie in consumer.cookies)
    verify(Client(), view, action_id, link, expected=(401, 403, 422))
    consumer.request("/jit/" + other["session_id"] + "/" + other_id, expected=(401, 403))
    command(scoped, {"type": "patch_account", "patch": {"payment_status": "settled"}},
            client=consumer, action_id=action_id, expected=(403, 422))
    print("PASS scoped demo auth: no-cookie denial, single use, account binding and command allowlist")

    scoped = command(scoped, {"type": "match_preferences", "preferences": {"frequency": "weekly", "max_instalment_usd": 80}}, client=consumer, action_id=action_id)
    scoped = command(scoped, {"type": "save_draft", "option_id": "weekly-80"}, client=consumer, action_id=action_id)
    assert scoped["conversation"]["draft"]["status"] == "saved"
    assert scoped["account"]["plan_status"] != "active" and scoped["payment"] is None
    draft_id = scoped["conversation"]["draft"]["id"]
    # A separate browser/auth session returns to a new, purpose-bound resume link.
    scoped, resume_id = create_action(scoped, "resume")
    returning = Client()
    restored = verify(returning, scoped, resume_id, issue(scoped, resume_id))["view"]
    restored = command(restored, {"type": "resume_draft"}, client=returning, action_id=resume_id)
    assert restored["conversation"]["draft"]["id"] == draft_id
    assert restored["conversation"]["draft"]["option_id"] == "weekly-80"
    assert restored["account"]["plan_status"] != "active" and restored["payment"] is None
    print("PASS draft: server-side save, leave, fresh auth and revalidated resume without obligation")

    restored = command(restored, {"type": "patch_account", "patch": {"payment_status": "pending"}})
    stale = command(restored, {"type": "resume_draft"}, client=returning, action_id=resume_id, expected=(200, 422))
    if "view" not in stale and "conversation" in stale:
        assert stale["conversation"]["draft"]["status"] != "saved"
    assert operator.request("/sessions/" + restored["session_id"])["view"]["confirmed_plan"] is None
    print("PASS stale draft: current pending payment blocks a repayment agreement")

    review, review_id = create_action(open_session(), "review")
    reviewer = Client()
    review = verify(reviewer, review, review_id, issue(review, review_id))["view"]
    option = next(option for option in review["portal"]["options"] if option["matches"])
    command(review, {"type": "confirm_plan", "option_id": option["id"]}, client=reviewer, action_id=review_id, expected=422)
    review = command(review, {"type": "save_draft", "option_id": option["id"]}, client=reviewer, action_id=review_id)
    review = command(review, {"type": "confirm_plan", "option_id": option["id"], "confirmed": True,
                              "review_token": review["portal"]["review_token"]}, client=reviewer, action_id=review_id)
    assert review["account"]["plan_status"] == "active" and review["confirmed_plan"]
    assert review["payment"] is None
    assert review["conversation"]["draft"]["status"] == "confirmed"
    assert review["conversation"]["decision"]["chosen_action"] == "plan_confirmed"
    assert all(action["status"] == "completed" for action in review["conversation"]["jit_actions"])
    assert review["decision"]["outcome"] == "SUPPRESS"
    assert any(message["kind"] == "jit_outcome" for message in review["conversation"]["messages"])
    print("PASS authenticated review: explicit confirmation activates only approved terms and updates SMS")

    view, action_id = create_action(open_session(), "account")
    expired = issue(view, action_id)
    view = command(view, {"type": "expire_jit_links"})
    verify(Client(), view, action_id, expired, expected=(401, 403, 422))
    fresh = issue(view, action_id)
    client = Client()
    verify(client, view, action_id, fresh)
    view = command(view, {"type": "expire_jit_session"})
    client.request("/jit/" + view["session_id"] + "/" + action_id, expected=(401, 403))
    print("PASS auth expiry: expired link and revoked demo session rejected")
    print("All V2 checks passed through " + BASE)


if __name__ == "__main__":
    main()
