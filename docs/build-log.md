# Build log

## Execution checklist

- [x] Ground the brief, existing apps, supplied economics and constraints.
- [x] Sketch two domain designs, compare, select and combine useful parts.
- [x] Implement decision and replay domain.
- [x] Implement portal, simulator and commercial model, including user-requested branding and account-lifecycle refinements.
- [x] Verify policy boundaries, API and browser journeys.
- [x] Prepare and render the two-page decision note; review the final submission.

## Working record

- 22 October 2026, 19:19 Sydney: began the implementation session. Original files remain in `brief/`; the user's execution brief is saved separately as `docs/master-project-brief.txt`.
- The earlier initialization created Next.js 16.4.2, Elixir 1.19, Ash 3.37 and Plug/Bandit. No product logic existed at this point.
- Validated the supplied baseline: $1.78m total settled cash; engaged cohorts C2-C4 contain 18,000 consumers, 4,600 payers and $820,000 cash. Reach and lift are assumptions, not measured effects.

- Architecture selected the session-centric design after a read-only comparison. The user then started separate frontend, backend and commercial chats and authorised coordination. File ownership was clarified to avoid overlapping edits. The main chat owns integration, README, build log and final verification.
- Scope remains local and in-memory. Additional infrastructure and production integrations are excluded.

## Verification and scope

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

## Final verification

- 20:30 Sydney: final frontend lint, type checks and production build pass. Final backend run reports 49 tests and zero failures; formatting and compilation with warnings as errors pass.
- The revised consumer flow is setup → review → active plan. Confirmed views show the reviewed schedule, scheduled completion and a working support path. Pending payment replaces payment actions. The demo selector contains S04/S05/S06; all twelve supplied scenarios remain available to backend regression tests.
- Desktop and 390px mobile browser checks pass. Financial comparisons scroll inside their own table; the page does not drift horizontally. The financial view independently reconciles with the canonical Python model, including zero reach/lift and shortened persistence horizons.
- Final HTTP smoke passes on both the direct API and Next.js proxy, including actual 14:15 handoff suppression while delayed events are invisible, command idempotency, explicit confirmation, authoritative payment schedules, no-match help and target feasibility. The independent commercial model passes its reproducibility check.
- Final PDF remains two readable A4 pages. Screenshot artefacts show the final branded portal, confirmed plan and financial view. Old visual-direction screenshots were removed.

The local build is complete. Production integration, compliance approval and real pilot measurement remain future work, as specified in the decision note. No live sends, payments or model calls were made.
