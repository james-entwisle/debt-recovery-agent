# Build log

V1 records below describe the completed event-driven portal demonstration. V2 supersedes its navigation, conversational and authentication scope; the current implementation and verification are recorded at the end. Original exercise inputs remain unchanged.

Latest progress review: 22 October 2026, 20:48 Sydney. V1 is committed at `6512444`. V2 is implemented in the working tree and still under integration. Backend and fresh-process HTTP checks pass; frontend lint and verification through the default running servers still need attention. This snapshot does not mark V2 complete.

## V1 execution checklist

- [x] Ground the brief, existing apps, supplied economics and constraints.
- [x] Sketch two domain designs, compare, select and combine useful parts.
- [x] Implement decision and replay domain.
- [x] Implement portal, simulator and commercial model, including user-requested branding and account-lifecycle refinements.
- [x] Verify policy boundaries, API and browser journeys.
- [x] Prepare and render the two-page decision note; review the final submission.

## V1 working record

- 22 October 2026, 19:19 Sydney: began the implementation session. Original files remain in `brief/`; the user's execution brief is saved separately as `docs/master-project-brief.txt`.
- The earlier initialization created Next.js 16.4.2, Elixir 1.19, Ash 3.37 and Plug/Bandit. No product logic existed at this point.
- Validated the supplied baseline: $1.78m total settled cash; engaged cohorts C2-C4 contain 18,000 consumers, 4,600 payers and $820,000 cash. Reach and lift are assumptions, not measured effects.

- Architecture selected the session-centric design after a read-only comparison. The user then started separate frontend, backend and commercial chats and authorised coordination. File ownership was clarified to avoid overlapping edits. The main chat owns integration, README, build log and final verification.
- Scope remains local and in-memory. Additional infrastructure and production integrations are excluded.

## V1 verification and scope

- 19:49 Sydney: 46 ExUnit tests pass; formatter check and compilation with warnings as errors pass. Coverage includes Ash role policies and typed actions, S04-S12, delayed authority/event clocks, inclusive rolling boundaries, duplicate commands/events, dynamic rescheduling, failed handoffs and explicit plan confirmation.
- `scripts/check-demo.py` passed against both API4000 and the production Next.js proxy on3000. It exercises S04 provider handoff, S05/S06 suppression before notification arrival, command retry/conflict, approved-option matching/confirmation, no-match help and economic reference arithmetic.
- Browser checks confirmed payday/weekly/$80 matching, disabled confirmation before explicit consent, activation without debit, shared simulator suppression after confirmation, and S05/S06 at+15 minutes before their delayed notifications.
- The independent Python commercial model passes `--check`. All five source files remain byte-identical to the supplied originals. Production npm audit reports zero findings; the previously documented ESLint development-chain findings remain.
- The user requested ranges instead of presenting a 3-point lift as definitive. The note and calculator now lead with illustrative +1 to+5-point sensitivity and show a no-lift downside. These ranges are not probability estimates or confidence intervals.
- Final decision-note rendering is two A4 pages with 11pt body text. Both pages were visually inspected after integration status was updated.
- The user requested a second frontend visual direction in the frontend chat. That chat is revising branding while preserving the verified API and behaviour. Final visual validation and packaging remain.

The implementation uses fixtures and ephemeral sessions. Authentication, source services, message delivery, support, plans and payments remain local simulations. No live model calls or debits occur. No production approval or causal result is claimed. Production integration, real disclosures, durable orchestration, operational ownership, privacy/retention and mature randomised outcomes remain dependencies.

- The commercial chat's later user request added a four-month payback planning tool. The backend now returns an authoritative `target_solve` with feasibility and conversion caps. Its reference requirement is about +5.5972 points among reached consumers, not an expected lift. The four-month target remains distinct from the note's 12-month proposed investment gate.
- 48 backend tests pass after the target solver. The running HTTP smoke script also verifies the reference target and zero-reach infeasibility.

- Final replay review caught a weak exception demonstration: retaining the original contact two days later meant the +15-minute check was not an actual due handoff. Changed the candidate wait to 45 minutes after engagement and moved the same queued contact to the next policy-permitted time. In supplied S04-S06 that is 14:15 UTC. S05/S06 now suppress a due replacement before the delayed notifications arrive. Original contacts remain visible and shared budgets still apply. This is an explicit experimental timing choice, not a supplied capability or rule.

- The user's later portal-coherence request narrowed visible demo selection to S04/S05/S06 and moved optional preferences into plan setup. The active-plan overview now uses authoritative backend schedule fields derived from fixed fixture terms. There is no saved partial-plan resumption or payment-method management.
- Backend schedule derivation includes calendar-anchored monthly dates, fixture totals/counts and confirmed-plan preservation. The backend suite now has 49 passing tests. The HTTP smoke also checks the weekly eight-payment schedule and its confirmed-plan copy.

## V1 final verification

- 20:30 Sydney: final frontend lint, type checks and production build pass. Final backend run reports 49 tests and zero failures; formatting and compilation with warnings as errors pass.
- The revised consumer flow is setup → review → active plan. Confirmed views show the reviewed schedule, scheduled completion and a working support path. Pending payment replaces payment actions. The demo selector contains S04/S05/S06; all twelve supplied scenarios remain available to backend regression tests.
- Desktop and 390px mobile browser checks pass. Financial comparisons scroll inside their own table; the page does not drift horizontally. The financial view independently reconciles with the canonical Python model, including zero reach/lift and shortened persistence horizons.
- Final HTTP smoke passes on both the direct API and Next.js proxy, including actual 14:15 handoff suppression while delayed events are invisible, command idempotency, explicit confirmation, authoritative payment schedules, no-match help and target feasibility. The independent commercial model passes its reproducibility check.
- Final PDF remains two readable A4 pages. Screenshot artefacts show the final branded portal, confirmed plan and financial view. Old visual-direction screenshots were removed.

The local build is complete. Production integration, compliance approval and real pilot measurement remain future work, as specified in the decision note. No live sends, payments or model calls were made.


## V2 conversational pivot

- 22 October 2026, 20:37 Sydney: started the user-requested V2 evolution. The new execution request is saved separately in `docs/v2-project-brief.txt` and takes precedence over the V1 request.
- Reused the Phoenix/Ash decision boundary, pure policy, source/event replay, typed approved options, plan schedule calculation, serial session ownership and existing commercial model. The original contact/event scenarios remain unmodified.
- Replaced the main navigation with SMS Simulator, JIT Portal and Financial Model, with SMS first and selected by default. Restored all twelve supplied scenarios to the operator selector.
- Established `docs/v2-contract.md` before parallel implementation. Frontend owns conversation and JIT UI plus the typed API adapter. Backend owns conversation state, drafts and scoped demo authentication. Commercial/documentation owns its independent economics panel and decision package. Lead owns shared navigation, integration, README, HTTP checks and final packaging.
- The shortest working path uses deterministic intent rules and fixed synthetic templates, without a network model, provider, database or production identity service. These omissions are deliberate within the three-hour take-home timebox.
- Incoming service replies and proactive contacts are separate action classes. The original shared rolling limits, weekday contact window and source-state handoff checks stay authoritative for proactive outreach. A consumer reply does not create an extra queued collection message or fresh permission.
- New SMS examples are invented fixtures, separate from the supplied scenario JSON. Formal hardship and dispute holds are explicit simulated human/account-service changes, not classifier decisions.
- Added `scripts/check-v2.py` to exercise the running API and Next.js proxy with a real cookie jar. It covers multi-turn preference memory, distinct intent routes, STOP, scoped and single-use verification, expiry, draft save/leave/resume and stale account revalidation. Final results are recorded after integration below.

### V2 verification and remaining production dependencies

Final integration verification passed at 20:55 Sydney. No production capability is inferred from the demo. Inbound SMS availability, approved identity verification, US content approval, durable storage, privacy/retention, abuse controls and operational ownership must be established separately. The four-week production proposal is narrower and conditional on those prerequisites.

### Independent progress review, 22 October 2026, 20:48 Sydney

Reviewed the current working tree against the V2 brief, contracts, source and tests. The implementation chat, `Set up Indebted interview repo`, was still active, so these results apply to the files present during this review. Its chat ID is `01a162a4-e3cd-7972-805e-0d4c5ef205ba`. No application code was changed by this review.

Implemented so far:

- Navigation now selects SMS Simulator by default, followed by JIT Portal and Financial Model. New `sms-simulator.tsx` and `jit-portal.tsx` components use the shared session and typed API adapter. Browser interaction and visual verification of this V2 UI remain outstanding in this review.
- New backend `conversation.ex` handles bounded deterministic intent classification, explicit preference memory, distinct assistance routes, STOP and JIT descriptors. New inbound examples are separate invented fixtures. Existing policy, replay, approved terms, confirmation and economic calculations are reused.
- `replay.ex` adds unconfirmed draft save/resume and expiry with current-account and approved-term revalidation. `session.ex`, `jit_auth.ex`, controller and routes add single-use opaque links, scoped cookies, purpose-restricted commands and expiry controls. Identity verification remains simulated; sessions and drafts remain in memory.
- The Financial Model adds a separate conversational calculator, independent Python reproduction, saved scenarios and a check against the actual TypeScript calculation. README, architecture, discovery, assumptions and decision materials now describe the pivot and conditional pilot. The current decision PDF reports two A4 pages; this review checked metadata only, not layout or source/export equivalence.

Checks run during this review:

| Check | Result |
| --- | --- |
| `npm run test:api` | 65 tests, zero failures, including the original policy regressions and new conversation/authentication cases. |
| `mix format --check-formatted`; `mix compile --warnings-as-errors` | Pass in `apps/api`. |
| `npm run typecheck` | Pass. |
| `npm run lint` | Fail with five `react/no-unescaped-entities` errors: one in `conversation-economics.tsx:60`, four in `jit-portal.tsx:126`, `:150`, `:182`, `:193`. |
| `scripts/check-demo.py` through API 4000 and proxy 3000 | Pass on both. |
| `scripts/check-v2.py` through API 4000 and proxy 3000 | Fail at the first `receive_sms` command with HTTP 422, `unknown_or_invalid_command`. Both point to an older running API. |
| Both HTTP suites against a fresh API on port 4012 | Pass. This separates stale running code from the implementation currently on disk. |
| `scripts/check-brief.py` | All five supplied files remain byte-identical to their originals. |
| Both commercial Python models with `--check` | Pass. |
| `node docs/commercial/check-conversation-ui.mjs` | Pass, including zero reach/response and conversion caps. Node emits a non-failing package module-type warning. |
| `git diff --check` | Pass. |

The fresh API HTTP checks cover multi-turn payday/amount memory, immutable approved terms, distinct question/dispute/hardship routes, STOP, no extra proactive contacts, access denial without a cookie, wrong-account/action and reused-link rejection, cookie flags, command allowlists, draft save/leave/fresh-auth resume, pending-payment revalidation, explicit plan confirmation, SMS outcome updates and link/session expiry.

Remaining integration work:

1. Correct the five JSX lint errors and rerun lint.
2. Restart the default API with the V2 code, then rerun both HTTP suites directly and through the Next.js proxy. Restarting loses existing in-memory sessions, so the demo must open a fresh scenario.
3. Run the V2 production build, then check the SMS-to-JIT-to-SMS journey, independent JIT state selection, account switching and desktop/mobile layout in the browser. V1 screenshots and successful V1 browser checks do not establish V2 readiness.
4. Visually inspect the updated two-page PDF, capture current V2 screenshots and finish packaging. V2 changes are still uncommitted on `main`; commit/submission status must be recorded separately when completed.

AI involvement remains development assistance from Codex and the earlier frontend, backend and commercial workstreams. Consumer replies use deterministic code and synthetic templates. Live LLM calls, inbound SMS delivery, real authentication, durable resumption, production support operations and payments are deliberately deferred. No production readiness, compliance approval or causal return is claimed.


- Final V2 backend verification: 65 ExUnit tests pass, including the preserved policy cases, conversation intent/memory, escalation persistence, immutable terms, draft revalidation and token/cookie scope/expiry. Formatting and warnings-as-errors compilation pass.
- Final frontend lint, TypeScript checks and production build pass. The running original and V2 HTTP suites pass directly on API4000 and through the Next.js proxy on3000. The final V2 suite also verifies confirmed draft status, completed task descriptors and current conversation outcomes.
- Browser verification completed SMS payday then amount memory, an SMS-generated JIT task, pre-verification financial-data hiding, scoped demo verification, saved draft, leaving, a fresh verified return, revalidation, explicit plan confirmation and the resulting SMS/policy outcome. S06 due-handoff suppression was checked in the new UI. The original HTTP suite continues to prove S05 and S06 before delayed event arrival.
- A final browser check found a stale resume label after plan confirmation. JIT outcomes now update the conversation decision, mark the matching draft confirmed and mark completed task descriptors; the UI hides completed action links. Confirmation never triggers a debit.
- Original and conversational Python models pass reproducibility checks. The actual TypeScript conversational calculation matches independent saved Python scenarios, with zero reach/response and conversion caps checked. The small Node module-type warning in this standalone verification is non-blocking; no app configuration change was needed.
- Final decision PDF is exactly two A4 pages with 11pt body text; both final pages were visually inspected. Fresh V2 screenshots replace obsolete V1 screenshots. All five original brief files remain byte-identical.
- No optional live LLM, production SMS/email, database, identity provider or payment integration was added. Production security, compliance, inbound feasibility, durable state, retention and mature causal outcomes remain explicit dependencies. V2 uses bounded server memory and discloses restart/idle expiry.
