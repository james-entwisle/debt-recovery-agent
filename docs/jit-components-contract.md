# Focused JIT component contract

User request: `docs/jit-component-brief.txt`. Prioritise plan setup, draft return, date change, frequency change and early payoff. Frontend chat owns apps/web except financial components. Lead owns apps/api, this contract and integration verification. Preserve three tabs, original fixtures, policy and economics. No production integrations.

## Added task states

`active_plan`, `change_date`, `change_frequency`, `early_payoff` extend existing JitState. SMS explicit setup intent routes to options; date change routes to change_date when active, otherwise payday; frequency request routes to change_frequency when active, otherwise payday; full-balance intent routes early_payoff. Holds/pending/escalation remain authoritative before offering actions.

## Authenticated portal additions

`portal.payment_methods`: fixed invented eligible masked records `{id,label,last4,eligible:true,simulated:true}`. IDs `demo_card_4242` and `demo_card_1881`. Only the first exists initially; add_demo_payment_method introduces the second through a clearly simulated provider step. Both are fixed masked examples. No actual card/bank/security-code input. New plan confirmations/payment records include `payment_method_id` and `payment_method_label`; ID must be one of the fixed examples.

## Plan and draft commands

Existing `confirm_plan` may add `payment_method_id`; omission keeps legacy default for compatibility. New UI must select and review a method before confirmation.

`save_draft` adds optional `step` enum `options|schedule|method|review`, and optional `payment_method_id`. It preserves existing draft ID/created_at_utc, sets updated_at_utc and stores step, selected immutable option and preferences. Omitted fields keep prior safe selection/default. Only safe fixture method ID is saved; no credentials. `resume_draft` returns the saved step and revalidates account, expiry and terms. Default legacy step is options.

## Active plan and amendments

Operator-only `{type:"setup_demo_active_plan"}` creates a clearly audited compatible synthetic active monthly plan using existing approved fixture terms, a masked demo method and unchanged balance. This is a visible operator setup button, never a silent consumer navigation effect. It is excluded from scoped consumer command allowlists. Source holds/pending states must not be overwritten by it.

`{type:"request_plan_change", change_type:"date", requested_date:"YYYY-MM-DD"}` or `{type:"request_plan_change", change_type:"frequency", requested_frequency:"weekly"|"fortnightly"|"monthly"}` logs a structured request only when current active plan details are available and no pending/settled payment, hold or unresolved support review blocks it. Date is today or later in scenario time, frequency must differ from current. No approval or altered schedule is implied. Request review UI must say existing instalments stay in place pending team approval. No amendment-authority data exists in the supplied materials. Do not fabricate immediate amendment approval.

Success adds a normal support_requests entry, also returned in plan_change_requests, with `kind:"plan_change"`, `change_type`, relevant requested value and `status:"requested"`. Account and confirmed plan schedule remain unchanged. Conversation gets a contextual date/frequency request outcome, not a changed-plan message.

## Early payoff

`{type:"simulate_early_payoff", confirmed:true, reviewed_balance_usd:number, payment_method_id:string}` checks fresh positive balance equals reviewed amount, approved demo method, no hold/pending/settled/unresolved review, and valid existing plan/no plan. Records the FULL current balance as a synthetic pending payment. Active plan and future instalment schedule remain unchanged. No discount, penalty, cancellation or settlement inferred. Repeated payment mutation is blocked by current pending state. Result message says payment pending, not paid.

## Scoped task commands

Plan creation/resume tasks preserve current allowed commands. `active_plan` permits only request_help. `change_date` and `change_frequency` permit only the matching request_plan_change subtype and request_help. `early_payoff` permits simulate_early_payoff, add_demo_payment_method and request_help. Plan setup and one-off payment tasks also permit adding the fixed masked example method. Operator setup never permitted by JIT cookie. All link scope/expiry/idempotency checks remain intact.


## Verification

The backend suite now contains 72 passing tests. Coverage includes saved-step and safe-method restoration, stable draft identity/timestamps, scoped date/frequency request types, unchanged active schedules and stale/duplicate full-balance payment protection. The existing policy and economic regressions still pass. Both HTTP suites pass directly and through the Next.js proxy. A secure task can complete after a channel opt-out, while its SMS confirmation is recorded as suppressed.

Browser verification has confirmed saving the selected method and final-review step, leaving, fresh scoped verification, restoration with consent unchecked, and explicit confirmation. Final date request, frequency request and early-payoff browser checks pass. Mobile viewport and document both measure 390px, with a 354px task panel. Final shared frontend lint, type checks and production build pass after concurrent SMS edits settled. The verified build is running on localhost:3000; API source was restarted and HTTP checks passed again. Browser checks were recorded locally. The stored screenshots were removed because they showed the previous header mark. Changes remain local while other SMS/documentation work shares the workspace.
