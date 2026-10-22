# Adaptive Resolution API

Elixir, Phoenix and Ash backend for the synthetic demonstration. See the repository [README](../../README.md) for setup and the shared [integration contract](../../docs/integration-contract.md) for request and response shapes.

```sh
mix deps.get
mix run --no-halt
```

The service binds to `127.0.0.1:4000`. Set `API_PORT=4001` to change it. `GET /health` returns service status. Run `mix test` and `mix format --check-formatted` to verify the backend without starting its HTTP listener.

## Ash model

`IndebtedApi.AdaptiveResolution` is the business domain, the boundary for related resolution operations. It exposes generated code interfaces for two resources:

| Resource | Action | Responsibility |
| --- | --- | --- |
| `JourneyDecision` | `evaluate` | Produce a typed decision, reason codes, eligibility checks and contact proposal from current source state and visible events. |
| `ApprovedPlanOption` | `match_preferences` | Load a fixed synthetic option by ID and explain whether its unchanged terms match the consumer's preferences and current balance. |

Resource attributes include enum-constrained atoms, dates, timestamps, amounts, proposal maps and reason lists. Custom Ash changes call the pure policy and matching functions. Callers cannot supply decision fields or replacement plan terms as accepted attributes. Both resources use `Ash.DataLayer.Simple`; they produce validated resource structs while each session owns the audit history. There is no database to install.

Ash policies require a simulated journey-engine actor for evaluation and a simulated portal actor for matching. Domain authorization is always enabled, including when a caller tries `authorize?: false`. These are internal operation boundaries for the local demonstration. Separate JIT endpoints implement scoped demo-token authentication. Production identity verification remains unimplemented; unauthenticated operator endpoints are local synthetic controls. See the [architecture](../../docs/architecture.md) for the trust boundary.

`IndebtedApi.CaseStudy` groups the demonstration harness. Its `Demonstration` resource validates HTTP operation arguments and calls the session service. Contact eligibility remains a deterministic decision rule, so restricted accounts receive an explained `SUPPRESS` decision rather than losing access to an explanation through an authorization error.

## Conversation, drafts and access

`Conversation` recognises bounded explicit intents, merges stated preferences and proposes fixed synthetic replies or task descriptors. Escalation pauses collection prompts and plan mutations without applying an authoritative account hold. STOP changes synthetic source permissions immediately. Incoming replies create no extra proactive contact or permission.

`Session` owns opaque link hashes and scoped grants alongside conversation state. `JitAuth` defines random tokens, real-time expiry and per-task command allowlists. Links are single-use for one account/action; successful exchange sets an HTTP-only, SameSite Strict cookie. The browser identity checkbox is a simulation, not proof of identity. Local cookies intentionally omit Secure for HTTP.

Draft save/resume lives in `Replay`: preserve an unconfirmed approved selection, then revalidate current account, preferences, exact terms and expiry before return. Draft expiry uses fixture time; access expiry uses real server time. A plan-start event is never treated as saved form data. The [HTTP/data contract](../../docs/integration-contract.md) owns envelopes and status codes, and the [demo guide](../../docs/demo-guide.md) explains the return path.

## Replay and safety

Each session is an isolated GenServer. It serializes commands, contact coordination and provider handoffs. Command IDs prevent duplicate effects and reject conflicting reuse. Sessions expire after 30 minutes of inactivity; a restart clears them. The local service permits 128 concurrent sessions and 256 successful commands per session.

Source patches apply only at their effective time. Events appear only after ingestion, are deduplicated by event ID, and use occurrence time for recency. Advancing time visits source changes, event arrivals and queued deadlines in order, recomputing deadlines after deferrals. The policy receives current state and visible events, never future scenario patches.

Scheduling replaces an existing contact under its stable ID and preserves its original baseline. It does not send. Every handoff rereads source state, permissions, local timing and the shared rolling contact budget. Pending payments, active plans, holds, unknown required state and opt-outs block outreach. Failed provider delivery still counts as an attempt. Exact 24-hour and seven-day boundary attempts count. Explicit help or review-later intent pauses an already queued pilot replacement.

Audit entries include ordered sequence numbers, evaluated inputs, decisions, template/disclosure versions and simulated handoff results. Views expose the last 150 entries; sessions retain the last 500. The supplied S04 normal case, S05 delayed opt-out notification, S06 delayed payment notification and S07-S12 regressions are covered by tests.

## Modifying the demonstration

Change engagement ranking, the 45-minute waiting interval, eligibility, timing and shared budgets in `lib/indebted_api/policy.ex`. A contextual replacement moves the same queued contact to the next permitted time after that interval, keeping its original schedule visible for comparison. Change preference matching in `lib/indebted_api/portal.ex` and action authorization in the two Ash resources. Change simulated effects and replay transitions in `lib/indebted_api/replay.ex`. Conversation routing and fixed replies live in `lib/indebted_api/conversation.ex`; scoped command permissions live in `lib/indebted_api/jit_auth.ex`.

The supplied files under `brief/` are read without modification. Additional plan terms live in `priv/fixtures/approved_plan_options.json`, labelled as invented demonstration fixtures. Plan confirmation requires a matching option, explicit confirmation and a current review token. Payment commands only set a synthetic pending state. All contacts, payment actions and template previews are simulated; no messaging, payment or model provider is connected.

Portal options and confirmed plans include `last_payment_date` and `payment_schedule`, with rows containing `date` and `amount_usd`. These derive from the fixed first date, frequency, instalment count and amount. Weekly and fortnightly dates advance by seven and 14 days; monthly dates advance by calendar months from the original date, clamping to month end where necessary. No provider charge or payment method is implied by a scheduled date.

The economics API also accepts `target_payback_months`, defaulting to four operating months after launch. Its additive `target_solve` output uses the same cohort mix, costs and cash assumptions as the selected scenario to calculate the required lift, extra payers and settled cash. Each cohort's conversion is capped at 100%. Unreachable targets return `feasible: false` and null required-lift/payer/cash values. `target_within_horizon` separately indicates whether the assumed persistence covers the target. These are conditional calculations, not evidence of achievable uplift; build time and ramp are excluded.
