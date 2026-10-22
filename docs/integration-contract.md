# Local demonstration contract

The current Phoenix routes and `IndebtedApi.Replay.view/1` are the source of truth for this contract. Next.js proxies `/api/*` to `API_URL`, default `http://127.0.0.1:4000`. All records and effects are synthetic. No authentication or external provider is implemented.

## HTTP

| Method and path on API | Request | Success |
| --- | --- | --- |
| `GET /health` | None | `{status: "ok", service: "indebted_api"}` |
| `GET /scenarios` | None | `{scenarios: [{id, label}]}` |
| `POST /sessions` | `{scenario_id: "S04", arm: "treatment"}` | `{ok: true, view}` |
| `GET /sessions/:id` | None | `{ok: true, view}` |
| `POST /sessions/:id/commands` | `{command_id, command}` | `{ok: true, view}` |
| `GET /economics` | None | Default financial assumptions, baseline, result and sensitivity |
| `POST /economics` | Assumption fields | Recalculated financial assumptions, baseline, result and sensitivity |

Session errors use `{ok: false, error: "reason_code"}` with an appropriate 4xx status. Session IDs isolate demonstrations. The UI should retain one ID across the portal and simulator, refresh on returning to the window, and use the server's revision to avoid replacing a newer view with an older response.

## Commands

`command_id` is a fresh opaque ID for a new operation. Retrying the same ID and payload has no duplicate effect; reusing an ID with another payload is rejected.

- `{type: "evaluate"}` refreshes the policy result.
- `{type: "advance", to_utc}` advances the simulated clock forwards, visiting intermediate source changes, event arrivals and handoff deadlines.
- `{type: "schedule"}` applies the current replacement proposal to the existing queued contact, preserving its ID. The candidate timing is 45 minutes after the engagement occurrence, moved to a permitted time by the shared budget and local window. It does not hand off a message.
- `{type: "handoff", contact_id, delivery_result?: "failed"}` runs a source-state and policy recheck. The contact must be due before a simulated provider handoff can occur.
- `{type: "set_stop", stopped: true|false}` changes the local pilot stop control.
- `{type: "patch_account", patch}` modifies allowed synthetic account fields for an interview experiment.
- `{type: "record_intent", intent}` records an explicit consumer choice.
- `{type: "match_preferences", preferences: {payday?, frequency?, max_instalment_usd?}}` matches fixed synthetic options. It does not change their terms.
- `{type: "request_help"}` logs a structured synthetic assistance request. No immediate reply is promised.
- `{type: "confirm_plan", option_id, confirmed: true, review_token}` activates only a currently matching, explicitly reviewed synthetic option. The token comes from `view.portal.review_token`.
- `{type: "simulate_payment", amount_usd, confirmed: true}` creates a synthetic pending payment. No money moves.

Intent values: `explore_payment`, `explore_plan`, `payday_preference`, `balance_question`, `affordability_concern`, `request_help`, `review_later`.

## View

The complete view contains session/scenario/consumer IDs, current clock and revision, current authoritative `account`, visible deduplicated `events`, original and current `contacts`, shared `contact_history`, current `decision`, stated `intent` and `preferences`, `portal` matching results, `support_requests`, `confirmed_plan`, `payment`, versioned `message`, `audit`, stop state and experiment metadata.

A decision contains `outcome`, `reason_codes`, `proposal` or null, eligibility checks, evidence IDs, policy version and evaluation time. Proposal, queued replacement and simulated handoff are distinct states. `message` is a preview of a synthetic template, with a fixed labelled disclosure placeholder and human approval dependency.

Experiment `assigned_arm` is a deterministic synthetic consumer assignment. `preview_arm` is the explicitly chosen counterfactual for the demonstration; selecting a scenario/arm opens a new session. This is not an actual pilot assignment or causal result.

## Financial assumptions

`population`, `reach_pct`, `lift_pp`, `support_pct`, `email_delta`, `sms_delta`, `composer_attempts`, `investment`, `months`, `cash_multiplier`, `cohort_mix: {C2, C3, C4}`. Cohort mix values are relative weights rescaled to `population`. Lift is absolute percentage points among reached consumers. `months` means successive equivalent new monthly intakes with lift, not future instalments from one intake.

`target_payback_months` is an optional planning assumption, default 4 and valid 1 to 36. The additive `target_solve` output contains `target_payback_months`, `required_monthly_contribution_usd`, `feasible`, `required_lift_pp`, `required_additional_payers`, `required_additional_cash_usd`, `max_monthly_contribution_usd`, `target_within_horizon` and `reason_codes`. Required lift/payers/cash are null when infeasible under cohort conversion caps. The four-month reference target requires about +5.5972 points among reached consumers; this is a requirement, not a prediction, and is distinct from the decision note's proposed 12-month gate.

`result` separates additional cash, retained revenue, payment costs, support, communication/model costs, monthly contribution, horizon contribution, net return and simple payback. At defaults: $56,880 cash, $6,098.40 monthly contribution and $73,180.80 across 12 monthly intakes, with approximately 8.20-intake payback. No effect is established by these assumptions.


## Plan schedule presentation

Each synthetic approved option and any confirmed plan includes `last_payment_date` and `payment_schedule: [{date, amount_usd}]`. The backend derives these only from fixed fixture dates, frequency, amount and instalment count. Monthly dates preserve the original calendar day with end-of-month clamping. Weekly and fortnightly fixtures end on 6 November 2026; the monthly fixture ends on 2 January 2027. These are scheduled dates, not settlement records or a guaranteed payoff date. No payment-method management is implemented.
