#!/usr/bin/env python3
"""Exercise the running demonstration over HTTP, including delayed source-state changes."""
import json
import os
import uuid
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = os.environ.get("API_BASE_URL", "http://127.0.0.1:4000").rstrip("/")


def request(path, body=None, expected_status=200):
    data = None if body is None else json.dumps(body).encode()
    req = Request(BASE + path, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=15) as response:
            status, result = response.status, json.load(response)
    except HTTPError as error:
        status, result = error.code, json.load(error)
    assert status == expected_status, (path, status, result)
    return result


def open_session(scenario):
    return request("/sessions", {"scenario_id": scenario, "arm": "treatment"})["view"]


def command(view, payload, command_id=None, expected_status=200):
    result = request("/sessions/" + view["session_id"] + "/commands", {
        "command_id": command_id or str(uuid.uuid4()), "command": payload,
    }, expected_status)
    return result.get("view", result)


def close(actual, expected):
    assert abs(actual - expected) < 0.001, (actual, expected)


def main():
    assert request("/health")["status"] == "ok"
    assert len(request("/scenarios")["scenarios"]) == 12

    normal = open_session("S04")
    assert normal["decision"]["outcome"] == "DEFER"
    assert normal["decision"]["proposal"]["scheduled_at_utc"] == "2026-09-16T14:15:00Z"
    assert len(normal["contacts"]) == 1
    assert not normal["contacts"][0]["pilot"]
    normal = command(normal, {"type": "schedule"})
    assert len(normal["contacts"]) == 1 and normal["contacts"][0]["pilot"]
    due = normal["contacts"][0]["scheduled_at_utc"]
    normal = command(normal, {"type": "advance", "to_utc": due})
    assert normal["contacts"][0]["status"] == "handed_off"
    assert len(normal["contact_history"]) == 2
    assert any(row["event"] == "provider_handoff_simulated" for row in normal["audit"])
    print("PASS S04: one queued replacement, one simulated provider handoff")

    for scenario, state_key, state_value, notification in [
        ("S05", "email_allowed", False, "all_electronic_opt_out"),
        ("S06", "payment_status", "pending", "payment_initiated"),
    ]:
        view = command(open_session(scenario), {"type": "schedule"})
        view = command(view, {"type": "advance", "to_utc": "2026-09-16T14:15:00Z"})
        assert view["account"][state_key] == state_value
        assert all(event["type"] != notification for event in view["events"])
        assert view["decision"]["outcome"] == "SUPPRESS"
        assert view["contacts"][0]["status"] == "suppressed"
        assert any(row["event"] == "contact_suppressed" and row["at_utc"] == "2026-09-16T14:15:00Z" for row in view["audit"])
        view = command(view, {"type": "handoff", "contact_id": view["contacts"][0]["contact_id"]})
        assert view["contacts"][0]["status"] == "suppressed"
        assert len(view["contact_history"]) == 1
        print("PASS " + scenario + ": authoritative state prevents handoff before event arrival")

    view = open_session("S04")
    op_id = str(uuid.uuid4())
    first = command(view, {"type": "record_intent", "intent": "explore_plan"}, op_id)
    retry = command(view, {"type": "record_intent", "intent": "explore_plan"}, op_id)
    assert retry["revision"] == first["revision"]
    assert retry["audit"] == first["audit"]
    command(view, {"type": "evaluate"}, op_id, expected_status=409)
    print("PASS command retries: no duplicate effects and conflicting ID reuse rejected")

    view = command(first, {"type": "match_preferences", "preferences": {"frequency": "weekly", "payday": "2026-09-18", "max_instalment_usd": 80}})
    matching = [option for option in view["portal"]["options"] if option["matches"]]
    assert len(matching) == 1 and matching[0]["id"] == "weekly-80"
    schedule = matching[0]["payment_schedule"]
    assert len(schedule) == 8
    assert sum(payment["amount_usd"] for payment in schedule) == 640
    assert schedule[0]["date"] == "2026-09-18"
    assert matching[0]["last_payment_date"] == schedule[-1]["date"] == "2026-11-06"
    command(view, {"type": "confirm_plan", "option_id": "weekly-80"}, expected_status=422)
    view = command(view, {"type": "confirm_plan", "option_id": "weekly-80", "confirmed": True, "review_token": view["portal"]["review_token"]})
    assert view["account"]["plan_status"] == "active"
    assert view["confirmed_plan"] is not None
    assert view["confirmed_plan"]["payment_schedule"] == schedule
    assert view["confirmed_plan"]["last_payment_date"] == "2026-11-06"
    assert view["decision"]["outcome"] == "SUPPRESS"
    print("PASS portal: approved-option matching and explicit confirmation boundary")

    view = command(open_session("S04"), {"type": "match_preferences", "preferences": {"frequency": "monthly", "payday": "2026-10-10", "max_instalment_usd": 10}})
    assert not any(option["matches"] for option in view["portal"]["options"])
    view = command(view, {"type": "request_help"})
    assert len(view["support_requests"]) == 1
    assert view["account"]["plan_status"] != "active"
    print("PASS no-match: structured help, no invented agreement")

    economics = request("/economics")
    close(economics["result"]["additional_cash_usd"], 56880)
    close(economics["result"]["monthly_contribution_usd"], 6098.4)
    close(economics["result"]["horizon_contribution_usd"], 73180.8)
    full_reach = request("/economics", {"reach_pct": 100, "support_pct": 0})
    close(full_reach["result"]["additional_cash_usd"], 94800)
    close(full_reach["result"]["monthly_contribution_usd"], 12324)
    target = economics["target_solve"]
    assert target["feasible"]
    close(target["required_monthly_contribution_usd"], 12500)
    close(target["required_lift_pp"], 5.597208698)
    impossible = request("/economics", {"reach_pct": 0})["target_solve"]
    assert not impossible["feasible"] and impossible["required_lift_pp"] is None
    print("PASS economics: reach-adjusted arithmetic, authoritative target solve and infeasible target")
    print("All running-demo checks passed through " + BASE)


if __name__ == "__main__":
    main()
