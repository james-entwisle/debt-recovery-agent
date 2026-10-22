# Local demonstration contract

The current Phoenix routes and `RecoveryApi.Replay.view/1` are the source of truth for this contract. Next.js proxies `/api/*` to `API_URL`, default `http://127.0.0.1:4000`. All records and effects are synthetic. Scoped, expiring demo-token authentication is implemented for JIT tasks. Identity verification and external providers remain simulated. The operator session routes intentionally expose synthetic data locally and are not production consumer endpoints.

## HTTP

| Method and path on API | Request | Success |
| --- | --- | --- |
| `GET /health` | None | `{status: "ok", service: "recovery_api"}` |
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


## V2 conversation and focused tasks

This section describes the implemented additive contract. The [V2 development agreement](v2-contract.md) records the original integration plan and ownership. `conversation` is part of each complete view. It contains deterministic mode, status, last intent, declared timing, explicit preferences, proposed/approved/suppressed message records, current decision, JIT descriptors and one unconfirmed server-side draft. Messages carry direction, kind, timestamp, status, template reference and optional action ID. The original contact policy result remains separate from the requested-service-reply decision.

New operator commands are `receive_sms {text}`, `create_jit {state}`, `expire_draft`, `expire_jit_links`, `expire_jit_session` and `exhaust_contact_budget`. Source changes still use `patch_account`. Formal hardship/dispute holds require these explicit operator/account-service controls. Intent recognition alone cannot apply one.

JIT states are `account`, `options`, `payday`, `draft`, `resume`, `review`, `payment`, `clarification`, `help` and `pending`. `save_draft {option_id}` stores the currently matching fixed terms and preferences, with no agreement or debit. `resume_draft` rechecks expiry, current account and exact approved terms. An invalid draft returns a recovery state; a successful HTTP status alone does not establish a restored draft. `confirm_plan` retains explicit confirmation and the current review token.

| Route | Purpose |
| --- | --- |
| `POST /sessions/:id/jit-links {action_id}` | Local operator issues a random opaque link token for one account/action. Returns token once and wall-clock expiry; no account financial detail. |
| `POST /jit/verify {session_id, action_id, token}` | Validate and consume token; return current view and an HTTP-only SameSite Strict cookie scoped server-side to the account/action. |
| `GET /jit/:id/:action_id` | Load a fresh view only with a valid scoped cookie. |
| `POST /jit/:id/:action_id/commands {command_id, command}` | Validate cookie, task-purpose command allowlist, idempotency and current domain rules. |

Tokens use cryptographic randomness; only hashes remain in server state. Link expiry is 120 seconds and scoped session expiry is 600 seconds on the real server clock. Draft expiry is 24 hours on the simulated scenario clock, bounded further by session inactivity/restart. Raw tokens are excluded from views/audit and filtered from Phoenix parameters. UI links use a fragment rather than a token in the HTTP URL path/query. The checkbox explicitly simulates an identity check; it is not proof of identity.

Missing/expired/incorrect cookies and invalid/reused/expired/wrong-purpose tokens return 401. A command outside the task allowlist returns 403. Missing session/action returns 404, conflicting command ID returns 409, and a rejected domain command returns 422. Cookies intentionally omit Secure for local HTTP, so these routes and operator endpoints must not be exposed as production infrastructure.

Conversation outcomes append a labelled service outcome to the same SMS session. Incoming replies neither create proactive contacts nor reset rolling budgets. A persistent assistance route pauses payment prompts without inventing a formal account hold. Human compliance must validate permitted service-reply classification before a real US pilot.

The conversational financial section calculates independently in a typed local module and has a Python reproducibility companion. It inherits the selected population, cohort mix, cash multiplier and investment while keeping SMS reach, response, responder lift and new costs separate from the preserved backend economics endpoint. No responder-only causal result is implied.


## Focused JIT library extensions

The current additive task contract is in `jit-components-contract.md`. Added states are `active_plan`, `change_date`, `change_frequency` and `early_payoff`. `portal.payment_methods` contains only server-issued masked synthetic references. `add_demo_payment_method` adds a fixed second example; no payment credentials are collected. Drafts preserve `step`, `payment_method_id`, stable draft ID and creation/update timestamps. Confirmation can specify an eligible example method.

`setup_demo_active_plan` is an audited operator-only fixture setup, excluded from all consumer scopes. `request_plan_change` records a date or frequency request in `plan_change_requests` with status `requested`, preserving current terms and schedule. The date and frequency cookies accept only their own request subtype. `simulate_early_payoff` requires explicit confirmation, the reviewed balance equal to fresh authority, and an eligible method. It records pending, preserves the active plan and balance until later authoritative settlement, and blocks another payment while pending.
