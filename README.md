# Adaptive Resolution

Help a consumer take the next useful step from the message thread they already use. They reply by SMS, or by iMessage where the handset and permission allow it, and say what is getting in the way: a payday, an account question, an interruption, or a need for help. The agent answers in the thread, or opens one authenticated task for that need. The portal is there to complete the task.

We chose a conversation because the current journey cannot tell those needs apart. Composer personalises the outbound email or SMS and still sends it on a fixed schedule. A click, a visit, or an unfinished plan does not change the next message, and the link opens the same account page. In the synthetic intake, 82,000 of 100,000 people never open that link. The same schedule settles $10.50 per person when there is no engagement and $95 after an unfinished plan. Eight interviews and fifty support conversations suggest the reason for leaving is often a date, an interruption, or an account question. The aim is faster recovery: less time to a confirmed plan, and earlier settled cash, with opt-outs and complaints kept in view. The [product vision](docs/product-vision.md) walks through that choice, the cohort split, and the measures.

This is a local product case study using synthetic data. V2 combines an **SMS Simulator**, a **Just-in-Time Portal** and a **Financial Model**. The conversation runs through deterministic rules; all messages, identity checks, account updates and payments are simulated.

Start with the [product vision](docs/product-vision.md), then the [two-page investment recommendation](output/pdf/DECISION.pdf), also available as [Markdown](DECISION.md). For the working demonstration, follow [Run locally](#run-locally) and the [demo guide](docs/demo-guide.md). Verification results and unresolved work live in the [build log](docs/build-log.md).

## The product and investment thesis

Composer personalises outbound messages within a fixed contact schedule. Our hypothesis is that some engaged consumers need a useful conversation and a relevant action: a date that fits an approved option, an answer about their account, a way to resume, or human assistance. A click alone cannot tell us which.

Start with consumers in the click, authenticated-visit and incomplete-plan cohorts who are currently eligible for the pilot. The supplied synthetic data contains 18,000 such consumers per intake, with 4,600 payers and $820,000 settled cash under the existing journey. Eight incomplete-plan interviews and 50 selected support conversations suggest timing, interruption and account questions as barriers. They establish neither population prevalence nor causal lift. SMS reach is unknown.

The consumer value is less repetition, clearer choices and room to decide without creating an obligation. The business hypothesis is that resolving these barriers produces additional settled cash and sustainable arrangements at an acceptable cost. The assumption most likely to fail is that relevance can overcome the real barrier. Affordability or creditor terms may matter more than the journey.

**Recommend a staged learning investment capped at $50,000.** Confirm inbound SMS, identity/security, US content approval and delivery cost in week one before committing the remaining budget. The strongest alternative is improved portal guidance using existing authentication; cost that alongside the conversation pilot. If prerequisites fail, run a constrained diagnostic or defer production.

## Commercial case

The opportunity is the 18,000 engaged consumers in each intake: 10,000 who clicked, 6,000 who visited without starting a plan, and 2,000 who started one and left it. They already produce 4,600 payers, a 25.56% paid rate and $820,000 settled cash. At 13% that baseline is $106,600 before messaging and support. It is not the value of the change. We use this group rather than only the 2,000 unfinished plans because a click or a visit is already a signal, and 2,000 people is too small to be the whole case. The other 82,000 are a later expansion.

The hypothesis is a higher 30-day settled-payment rate in this group than the fixed journey produces. The assistant and the just-in-time tasks are how someone would move from their current stage onto a confirmed plan and then a settled payment. A plan earns no fee until cash settles. The reference assumes 60% of the 18,000 encounter the intervention. Lift is an absolute increase in paid conversion among those people. Costs use the 15% fee, the 2% payment cost, and two extra support conversations per 100 reached consumers at $6. The new message replaces a scheduled one, so the send cost nets to zero. The build cap is $50,000.

| Hypothetical reached lift | Extra cash per intake | Annual contribution before build | Simple payback on $50,000 |
| --- | ---: | ---: | ---: |
| +1 percentage point | $18,960 | $14,026 | 42.8 months |
| +3 percentage points | $56,880 | $73,181 | 8.2 months |
| +5 percentage points | $94,800 | $132,336 | 4.5 months |

The +3-point row is the arithmetic reference: about $73,000 a year before the build, and about $23,000 left after it in the first year. Twelve equivalent new intakes, persistent effects, and no unpriced operating costs. The range is sensitivity, not a forecast. Cohort counts, unit costs, downside cases and the separate reply-funnel extension are in the [commercial model](docs/commercial/README.md).

## What the demonstration does

| Tab | Working behaviour |
| --- | --- |
| SMS Simulator | Select S01-S12, send an invented consumer reply, retain explicit preferences across turns, inspect the evaluated intent, current source state, next action and audit. |
| JIT Portal | Open a task from SMS or choose one independently. Exchange a single-use demo token for a scoped cookie, review fixed approved options, save/resume an unconfirmed draft, confirm explicitly or request help. |
| Financial Model | Explore reach, response, lift and cost sensitivity, alongside the preserved original model. Calculations have independent Python checks. |

The backend retains the original contact-policy engine. Incoming engagement grants no new permission. Proactive contact uses current authoritative state, verified local timing and one shared cross-channel budget. Payment pending, opt-out, active plans and holds suppress inappropriate outreach. Requested service replies have a separate classification that still needs production compliance approval.

For a short demonstration, use S04 to match an existing option and save/return to a draft. Then use S05 and S06 to show opt-out and pending-payment suppression before delayed notifications arrive. The [demo guide](docs/demo-guide.md) includes exact steps, no-match assistance, hardship and access-expiry cases.

## Pilot and decision gates

The production pilot is smaller than the demonstration: a limited approved intent set, fixed replies, existing approved options and human help. Reuse existing authentication where possible; include minimal resumption only if feasible. Exclude autonomous agreements/payments, new creditor terms and unapproved generated US content.

| Week | Deliverable and gate |
| --- | --- |
| 1 | Confirm inbound routing, identity/security, approved content, retention, support ownership and cost. Proceed only if the limited scope fits. |
| 2 | Implement limited inbound handling and policy-safe action routing. |
| 3 | Add focused authenticated tasks, instrumentation and minimal resume if feasible. |
| 4 | Complete integration tests and human compliance approval, then launch a capped experiment if prerequisites pass. |

Randomise consumers at intake against the existing journey, stratified by cohort. Measure treatment-control 30-day settled cash per assigned consumer, valued at 13% less actual incremental costs. Retain non-responders and later suppressed consumers in their assigned arm. Replies, clicks and confirmed plans are diagnostics; responder-only outcomes cannot establish causality. Follow 60/90-day cash and adherence to distinguish acceleration from durable recovery. Four weeks is a possible launch horizon, not mature efficacy evidence.

Expand only when safe, mature randomised evidence supports the proposed 12-month payback gate at verified scale and cost. Change the approach if reach, support load or unsuitable terms dominate. Pause for prohibited contact, disclosure failures, unauthorised commitments or serious harm. [The decision note](DECISION.md#expand-change-or-stop) defines stop conditions, proposed complaint/opt-out triggers and how to handle inconclusive results.

## Run locally

Requires Node.js 24, Elixir 1.19 and Erlang/OTP 28. No database, API key or paid service is required. From the repository root:

```sh
npm ci
cd apps/api
mix deps.get
cd ../..
```

Start each service in a separate terminal, from the repository root:

```sh
npm run dev:api
```

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). The API binds to [127.0.0.1:4000](http://127.0.0.1:4000). To use a different API port, pair `API_PORT=4001 npm run dev:api` with `API_URL=http://127.0.0.1:4001 npm run dev`.

For production-mode local testing, run `npm run build`, then `npm run start --workspace apps/web`. Set `API_URL` before building because rewrites are recorded in the build. After backend changes, restart the API and reset the scenario. Restart clears in-memory state; the [demo guide](docs/demo-guide.md#troubleshooting) covers stale servers and expired sessions.

## Architecture, simulation and autonomy

Next.js, TypeScript and HeroUI render the experience. Phoenix exposes the API. Elixir owns conversation routing and state transitions; Ash actions call the pure contact-policy and approved-option matching rules. One GenServer per session serialises commands and prevents duplicate effects. The [architecture guide](docs/architecture.md) explains authority, replay clocks and security boundaries.

The deterministic assistant classifies bounded explicit intents, records stated preferences and proposes permitted responses/tasks. It cannot invent terms, enrol a consumer, debit funds, determine legal outcomes or apply authoritative hardship/dispute holds. Escalation pauses collection prompts and routes to help. Explicit consumer confirmation and fresh account checks govern simulated commitments.

Token validation, purpose-bound cookies and draft revalidation are implemented. Identity proof, SMS delivery, support operations, source services and money movement are simulated. Drafts and conversations expire after inactivity and disappear on restart. Local operator endpoints intentionally expose synthetic data without authentication. This app must not be deployed as a production consumer service. Inbound SMS availability, durable storage, retention, security review and US compliance approval remain dependencies.

## Focused JIT actions

The component-library follow-up prioritises five tasks: compact four-step plan setup, return to a saved step, a payment-date request, a frequency-change request and early payoff. The operator-only state selector opens each task; active-plan examples use an explicit **Load active plan example** control. Consumer navigation never silently changes the account.

Setup follows approved option, schedule, masked example method and final review. Saving preserves the selected option, safe method reference and current step in the existing server draft. No card number, bank credentials or security code is collected. Date/frequency changes are structured requests for review because the case supplies no amendment authority; existing instalments remain in place. Early payoff reviews the current verified balance and records a pending simulated payment, without declaring settlement or cancelling a plan. See the [component contract](docs/jit-components-contract.md) and [implementation brief](docs/jit-component-brief.txt).

## Verify

Run from the repository root:

```sh
npm run lint
npm run typecheck
npm run build
npm run test:api
cd apps/api
mix format --check-formatted
mix compile --warnings-as-errors
cd ../..
```

With both servers running:

```sh
python3 scripts/check-demo.py
python3 scripts/check-v2.py
API_BASE_URL=http://localhost:3000/api python3 scripts/check-demo.py
API_BASE_URL=http://localhost:3000/api python3 scripts/check-v2.py
python3 docs/commercial/model.py --check
python3 docs/commercial/conversation_model.py --check
node --experimental-strip-types docs/commercial/check-conversation-ui.mjs
```

The HTTP suites verify original policy behaviour and V2 conversation, cookie and draft flows. Commercial checks reconcile saved results and the actual UI calculator. Commands are instructions, not a claim that every check currently passes. The dated [build log](docs/build-log.md) records executed checks and remaining work.

## Documentation index

| Read this | When you need it |
| --- | --- |
| [Product vision](docs/product-vision.md) | See the personal-agent thesis, the cohort the link never reaches, and the recovery dials. |
| [Decision note](DECISION.md) · [two-page PDF](output/pdf/DECISION.pdf) | Assess the recommendation, evidence, scope, economics, pilot and expand/change/stop criteria. |
| [Product philosophy](docs/product-philosophy.md) | Understand the consumer experience, autonomy boundaries and trade-offs guiding V2. |
| [Discovery and alternatives](docs/discovery.md) | Trace the move from abandoned-plan reminders to conversation and see what could overturn it. |
| [Commercial model](docs/commercial/README.md) | Read the 18,000-person investment case: cohorts, unit costs, contribution and payback. |
| [Assumptions and validation](docs/assumptions.md) | Find missing evidence and the checks required before production or expansion. |
| [Architecture](docs/architecture.md) | Understand component responsibilities, authoritative state, replay, drafts and authentication limits. |
| [Demo guide](docs/demo-guide.md) | Run the normal case and meaningful exceptions, with expected results and troubleshooting. |
| [HTTP and data contract](docs/integration-contract.md) | Integrate commands, session views, JIT access and economic inputs. |
| [Frontend](apps/web/README.md) · [backend](apps/api/README.md) | Locate implementation responsibilities and subsystem-specific behaviour. |
| [Build log](docs/build-log.md) | Review dated implementation, verification, AI contributions and unfinished work. |
| [Original assignment](brief/01_candidate_brief.md) · [supporting pack](brief/02_supporting_pack.md) | Read the unchanged source requirements, synthetic evidence and exercise policies. |
| [Brief digest](docs/brief-digest.md) · [V1 request](docs/master-project-brief.txt) · [V2 request](docs/v2-project-brief.txt) · [V2 implementation agreement](docs/v2-contract.md) | Review source summaries, requested scope and the development record. V2 supersedes V1 product direction. |

Codex assisted with source digestion, architecture, implementation, calculations, tests and writing. Frontend, backend and commercial workstreams contributed under a lead integrator. The candidate owns the recommendation. No consumer-facing model is called, and no live messages or payments are made.
