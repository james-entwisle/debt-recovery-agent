# Demonstrating V2

Follow the root [run instructions](../README.md#run-locally), then open [localhost:3000](http://localhost:3000). SMS Simulator is the default tab. S01-S12 are supplied synthetic policy scenarios; the inbound examples, creditor and approved plans are separately invented fixtures. Fixture dates are in September 2026 and amounts are USD.

The controls beside the conversation belong to the local operator. Switching scenario or resetting creates a fresh isolated session. SMS and JIT share that session, so consumer outcomes appear back in the conversation. All sends, identity checks, help requests and payments remain simulated.

## Normal case: approved option, save and return

1. Select S04. Send `I get paid every second Friday`, then `Yes, around $50`. Inspect the intent, remembered fortnightly frequency and $50 preference. No approved fixture matches this combination; the assistant cannot invent one.
2. Reset S04 for the successful draft path. In JIT Portal, select `Draft plan setup`, create a demo secure link, simulate the identity check and verify. Account details appear inside the task after verification.
3. Choose the fixed weekly $80 option. Continue through schedule review to payment-method selection. Save and finish later at that step. Check that no active plan or payment was created.
4. Leave the task, return to SMS and ask to continue the interrupted plan. Open the resume action, create and verify its fresh link, then resume. The server rechecks current account state, draft expiry and unchanged terms.
5. Resume at the saved payment-method step, choose a masked demo method, then review and explicitly confirm. A synthetic active plan appears, the SMS thread records the outcome and later proactive collection prompts are suppressed. No debit occurs.

An incomplete plan event alone cannot restore fields. Reset and send `I started setting up a plan yesterday but got interrupted` to show the no-saved-draft route.


## Five focused actions

The JIT operator selector groups plan setup, plan management, payments and assistance. It is outside the consumer task card. Each task has one purpose and a visible return to the conversation.

- Plan setup uses four steps: approved option, schedule, masked example method, review and explicit confirmation. The simulated add-method path never collects payment credentials.
- Resume restores the last explicitly saved step and safe selections after fresh verification and revalidation. Consent is never restored as already accepted.
- Change date and change frequency require an active plan. Use the explicit **Load active-plan example** operator control for the compatible monthly fixture. Review the requested value and submit it. The result is a request for team review; the agreed schedule remains unchanged.
- Early payoff reviews the current verified balance and a masked method, then requires explicit confirmation. Its result is pending. The balance and active-plan schedule are not cleared or cancelled by payment initiation.

SMS can open the same tasks. With the active example loaded, send `Can I move my next payment to Friday?`, `Can I pay fortnightly instead?` or `I want to clear my debt`. Without an active plan, frequency preferences open approved plan selection.

## Exception cases

| Case | Steps | Expected result |
| --- | --- | --- |
| Delayed opt-out, S05 | Reset S05. Expand `Clock and contact policy`, queue the proposal, then advance 15 minutes to 14:15 UTC. | Current source permissions suppress the due replacement before the delayed notification is visible. Advance another 15 minutes to see the notification. |
| Pending payment, S06 | Repeat the S05 sequence with S06. | Current pending payment suppresses the due replacement before its delayed event arrives. |
| Explicit STOP | Reset S04 and send `STOP`. | Electronic permissions change and proactive outreach is suppressed. Later conversation cannot restore permission. |
| Hardship or dispute | Send `I'm struggling with money` or `I don't recognise this debt`. | Assistance and escalation replace collection prompts. The classifier does not invent a formal source-account hold. |
| Account question | Send `Who is this creditor?`. | A clarification/help route, distinct from the dispute and hardship routes. |
| Changed account after saving | Save a valid draft, then simulate pending payment or a hold through source controls before resuming. | Revalidation blocks the stale repayment path. No agreement is created. |
| Expired access | Create a JIT link, use `Expire issued links`, then try to verify. After verification with a fresh link, expire the scoped session and check it. | The server rejects expired access. Wrong account/action and token reuse are also covered by automated checks. |

## Explore independently

Use the JIT state selector for account, options, payday, draft, resume, review, payment, clarification, help and pending tasks. Each new task requires its own scoped verification. Payment is an explicit simulated pending state; a selected `pending` task does not itself change the account.

In Financial Model, compare the original reached-consumer model with the conversational extension. Change reach, replies and support demand, then try zero lift. Explain the changed denominator and unvalidated costs using the [commercial guide](commercial/README.md). The editable payback target calculates a requirement, not an expected result.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| API unavailable | Start `npm run dev:api`; confirm `API_URL` matches `API_PORT`. The default API is local port 4000. |
| `unknown_or_invalid_command` for `receive_sms` | An older API may still be running. Restart it with current code and reset the scenario. |
| Missing or expired session | API restart and 30 minutes of session inactivity discard state. Reset to open a new scenario; drafts cannot survive a restart. |
| JIT verification rejected | Create a fresh link for the current account and action. Links last 120 real seconds, scoped grants 600 seconds. Advancing fixture time does not extend them. |
| Draft cannot resume | Check current payment/plan/hold state, unchanged approved terms and draft expiry. Drafts last at most 24 synthetic hours and remain bounded by the shorter in-memory session lifetime. |
| Proxy uses the wrong API | Restart Next.js after changing development configuration. Set `API_URL` before a production build because rewrites are recorded then. |

Run the root [verification commands](../README.md#verify) for HTTP, backend and commercial checks. The [build log](build-log.md) records dated results and remaining integration work; the presence of a walkthrough does not establish that browser verification is complete.
