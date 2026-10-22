# Build log

V1 records below describe the completed event-driven portal demonstration. V2 supersedes its navigation, conversational and authentication scope. Later sections are history. The current working tree is the 21:45 Sydney record at the end.

Latest implementation record: V2 was committed at `597f151` on 22 October 2026, 20:56 Sydney. Focused JIT tasks, the phone-style conversation, the product vision and the public-name change are uncommitted on top of that commit. The 21:45 record states which checks were rerun. The conversational sequence in that record is the current design history, including the move from consumer-prompted moments to agent follow-up when a reply or a plan stalls. Mobile layout for the phone is still open. Production dependencies remain unresolved.

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

Reviewed the current working tree against the V2 brief, contracts, source and tests. The implementation chat, `Set up the case-study repo`, was still active, so these results apply to the files present during this review. Its chat ID is `01a162a4-e3cd-7972-805e-0d4c5ef205ba`. No application code was changed by this review.

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


### Final V2 integration record, 22 October 2026, 20:56 Sydney

Recorded by the implementation workstream with commit `597f151`. These results supersede the earlier lint and stale-server findings.

- Final V2 backend verification: 65 ExUnit tests pass, including the preserved policy cases, conversation intent/memory, escalation persistence, immutable terms, draft revalidation and token/cookie scope/expiry. Formatting and warnings-as-errors compilation pass.
- Final frontend lint, TypeScript checks and production build pass. The running original and V2 HTTP suites pass directly on API4000 and through the Next.js proxy on3000. The final V2 suite also verifies confirmed draft status, completed task descriptors and current conversation outcomes.
- Browser verification completed SMS payday then amount memory, an SMS-generated JIT task, pre-verification financial-data hiding, scoped demo verification, saved draft, leaving, a fresh verified return, revalidation, explicit plan confirmation and the resulting SMS/policy outcome. S06 due-handoff suppression was checked in the new UI. The original HTTP suite continues to prove S05 and S06 before delayed event arrival.
- A final browser check found a stale resume label after plan confirmation. JIT outcomes now update the conversation decision, mark the matching draft confirmed and mark completed task descriptors; the UI hides completed action links. Confirmation never triggers a debit.
- Original and conversational Python models pass reproducibility checks. The actual TypeScript conversational calculation matches independent saved Python scenarios, with zero reach/response and conversion caps checked. The small Node module-type warning in this standalone verification is non-blocking; no app configuration change was needed.
- Final decision PDF is exactly two A4 pages with 11pt body text; both final pages were visually inspected. Fresh V2 screenshots replace obsolete V1 screenshots. All five original brief files remain byte-identical.
- No optional live LLM, production SMS/email, database, identity provider or payment integration was added. Production security, compliance, inbound feasibility, durable state, retention and mature causal outcomes remain explicit dependencies. V2 uses bounded server memory and discloses restart/idle expiry.


### Documentation pass, 22 October 2026, 20:55 Sydney

- Reworked the root README around V2's consumer problem, evidence, falsifying assumption, staged investment, conversational economics, smaller pilot, autonomy and decision gates. Added a task-oriented documentation index and retained local run/verification instructions.
- Added product philosophy and a separate demo guide. Reorganised commercial documentation to lead with V2 and distinguish responder lift from the original reach model. Both app READMEs, architecture, brand guidance and the brief digest now describe current V2 behaviour; the development ownership agreement is distinguished from the implemented HTTP contract.
- Reconciled the headline commercial cases with saved outputs and reran both Python model checks successfully. Verified 88 local documentation links/anchors, the actual TypeScript conversational calculation against independent cases, original-file integrity and whitespace. No application code, supplied brief files or decision-note source/PDF changed in this pass. Application integration status remains governed by the dated verification entries above.

### Current working tree, 22 October 2026, 21:45 Sydney

Uncommitted on `597f151`. This record supersedes the 20:56 integration snapshot as the description of the tree. It does not replace that snapshot's checks.

Focused tasks from `docs/jit-component-brief.txt` are implemented under `docs/jit-components-contract.md`. Plan setup can save the selected step and a masked example method. Date and frequency changes are review requests and leave the existing schedule in place. Early payoff records a pending payment for the reviewed balance and does not cancel a plan. Operator-only setup loads an active-plan example. `apps/api/test/jit_components_test.exs` covers those boundaries. The contract records an earlier pass of 72 backend tests, both HTTP suites, frontend lint, type checks, a production build, and browser checks of setup, resume, date, frequency and early payoff. Those checks predate the naming change below. The screenshots from that pass were removed because they showed the previous header mark.

The SMS tab is now the phone thread in `imessage-demo.tsx`. A message can open one secure task preview. The portal remains the task, not a second chat. The design sequence for that thread is below. Mobile layout for it is still being adjusted and is not signed off.

### Conversational interface, in order, 22 October 2026

1. **21:09.** The operator dashboard was the wrong demo. The SMS view should be a phone thread: a personal agent in the message the consumer already has, with one just-in-time link when an action is needed. Grey suggested replies inside the thread are a demo device. They are not a claim that iOS shows unsent messages.
2. **21:12.** The thread stays live. A rail of moments steps through the account sequence, and the suggested replies stay visible, with a short note that they are examples.
3. **21:16.** The old three-column simulator was still what opened. The phone has to be the default SMS view.
4. **21:19.** The assistant is not named after another company's agent. Copy should sound like a person helping with an account: short, specific, and not an essay about reach.
5. **21:20.** The thread can carry one link. It cannot carry a poll. A choice such as fortnightly or monthly belongs inside the task that link opens. The moments should follow the account, not a list of unrelated prompts.
6. **21:27.** An opening that announced the creditor and the balance as a stiff notice was rejected. The first message has to sound like the start of a conversation.
7. **21:35.** The improved copy was still too short and too cheerful. People writing about a debt are often distressed. Messages can be a little longer and should explain the next step. Add a silence moment: a few days, no reply, balance still open, no need to answer, STOP still available. Not every path is a completed plan.
8. **21:36.** A pass removed the moment rail and buried the suggested replies. Both came back. Suggested replies sit in the phone, where they can be seen. The rail stays beside it on a wide screen.
9. **21:40.** The opening regressed to a stock policy line. Conversational copy is the product surface. The fixed disclosure stays in its own labelled block and does not replace the message.
10. **21:43.** The full operator inspector is not the demonstration. The phone is.
11. **21:46.** The consumer will not narrate the pipeline. They will not text "I started a plan yesterday" or "I want to finish it" so the demo can move. The agent monitors the account: no reply, plan not started, plan started and not finished, card declined, balance still open. The next message is one the service sends. Each moment is a different stretch of the thread, with its own wording, not the same chrome filled with a new consumer prompt. The opening should say there is an account, the outstanding balance, and who it is with, then offer a plan where the person can choose when repayment starts.

What the code does now, against that last decision: the "No reply" moment is an agent line shown in the thread and is not typed by the consumer. The other moments still send a consumer sentence through the live engine, and the ghost replies in the phone still offer those sentences. The rail note still says moments send example replies. Closing that gap is the open conversational change. A follow-up still has to pass the existing contact policy before anything is treated as sent. The silence line is labelled as an example, not as a delivered proactive message.

Mobile work is in progress in `conversation-phone.css`. On a narrow screen the phone stays first, the moment list stacks under it, and the inspector stays out of the phone view. That pass is not finished and has not been signed off at desktop and phone widths.

`docs/product-vision.md` is the short product narrative: a thread-native agent, the 82,000 people who never open the account link, and the recovery measures. The README opens with that choice and lists the note in the documentation index.

The tree is prepared for a public repository. Visible copy, the header, package names and the Elixir application no longer use the previous company name. The application is `RecoveryApi` in `apps/api/lib/recovery_api`; the health service name is `recovery_api`. The header is a navy tile with an aqua bubble and a purple bubble, plus the words Debt Recovery Agent. The phone contact is Debt Recovery. SMS copy says "Hi, this is Debt Recovery." `brief/START_HERE.md`, `brief/01_candidate_brief.md` and `brief/02_supporting_pack.md` were edited for the same reason, so `scripts/check-brief.py` will no longer report those three files as byte-identical to the supplied originals. `brief/03_historical_cohorts.csv` and `brief/04_consumer_scenarios.json` were not edited. Git history still contains the previous name.

Checks run after the rename, on 22 October 2026:

| Check | Result |
| --- | --- |
| `mix test` in `apps/api` | 72 tests, zero failures. This includes the focused JIT cases and the preserved policy regressions. |
| Browser, `http://127.0.0.1:3000` | Header reads Debt Recovery Agent. The phone thread opens with "Hi, this is Debt Recovery." The task label reads Secure account. The page title is Adaptive Resolution. |
| `GET /health` | `{"status":"ok","service":"recovery_api"}`. The API was restarted, so in-memory sessions from the previous process are gone. |

Not rerun after the rename, the commercial-guide rewrite, or the brief-text edits: frontend lint, type check, production build, `scripts/check-demo.py`, `scripts/check-v2.py`, both commercial Python `--check` commands, and `scripts/check-brief.py`. The 20:56 and JIT-contract results do not cover this later tree. No live model call, SMS delivery, or payment was added.
