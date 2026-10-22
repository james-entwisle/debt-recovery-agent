# Adaptive Resolution

A local Product Lead case-study demonstration for InDebted. Recommend a capped four-week learning pilot for engaged US consumers: offer useful portal choices and adapt an existing scheduled contact using stated needs and current account state. Test whether it produces additional settled cash and sustainable repayment. The 18,000-consumer opportunity and all exercise inputs are synthetic; the assumed lift is not a forecast.

Start with the [two-page decision note](output/pdf/DECISION.pdf) or its [Markdown source](DECISION.md). Original materials remain unchanged in `brief/`; `docs/master-project-brief.txt` is the user's separate execution brief.

## Run

Requires Node.js 24, Elixir 1.19 and Erlang/OTP 28. No database, credentials or paid service is needed.

```sh
npm ci
cd apps/api
mix deps.get
cd ../..
```

Start the API in one terminal:

```sh
npm run dev:api
```

Start Next.js in another:

```sh
npm run dev
```

Open <http://localhost:3000>. The API defaults to <http://127.0.0.1:4000>. If 4000 is occupied, start the API with `API_PORT=4001 npm run dev:api` and Next.js with `API_URL=http://127.0.0.1:4001 npm run dev`. Set `API_URL` before building when using `next start`; Next.js records rewrites during the build.

## What to demonstrate

The portal and journey simulator share one in-memory consumer session. Select a scenario to reset it. The investment view leads with an illustrative +1 to +5 percentage-point lift range and computes sensitivity on the backend. At the reference reach and costs, that spans roughly $14k to $132k annual contribution. This is a scenario range, not a confidence interval; no effect is established. An editable four-month payback planning target calculates the lift required under the selected assumptions and flags infeasibility. It is separate from the note's proposed 12-month investment gate.

| Case | Demonstration |
| --- | --- |
| S04, normal | An incomplete plan triggers a proposed contextual replacement for the existing queued contact. Apply the proposal, advance to its proposed time after a 45-minute engagement wait, and inspect the simulated handoff. |
| S05, opt-out | Apply the proposal, then advance 15 minutes. Permissions have changed in the source service, while the delayed opt-out event is still invisible. The replacement is due at that point, and the authoritative handoff recheck suppresses it. |
| S06, pending payment | Repeat the 15-minute replay. Current payment status suppresses the due replacement before its notification arrives. |
| Portal match | State a payday, frequency and maximum instalment. Review matching fixed options and explicitly confirm a simulated plan. |
| Portal no-match | Choose a payday later than all fixture dates or a lower instalment limit. No new terms are invented; a structured help request can be logged. |
| Investment | Change reach, lift, support rate, cash proxy or persistence; recalculate contribution and payback. Baseline collections remain separate. |

The supplied scenarios use September 2026 clocks. They are independent examples, not a sample for estimating rates. The portal's creditor and approved options are separately labelled invented fixtures in `apps/api/priv/fixtures/approved_plan_options.json`. The backend derives the displayed payment schedule and scheduled completion date from those fixed terms. These dates do not represent payment settlement history or a guaranteed payoff date.

## Verify

```sh
npm run lint
npm run typecheck
npm run build
npm run test:api
cd apps/api
mix format --check-formatted
```

With both servers running, verify the actual HTTP integration and independent commercial model:

```sh
python3 scripts/check-demo.py
API_BASE_URL=http://localhost:3000/api python3 scripts/check-demo.py
python3 docs/commercial/model.py --check
```

See [commercial model instructions](docs/commercial/README.md) for assumptions and optional PDF rendering.

## Architecture and limits

Next.js, TypeScript and HeroUI present the consumer, simulator and investment views. A Phoenix JSON API invokes Ash actions. The `AdaptiveResolution` domain contains typed `JourneyDecision` and `ApprovedPlanOption` resources with actions and simulated-role authorization policies. Pure Elixir policy checks eligibility, permitted local times and shared rolling contact budgets. Session GenServers serialise synthetic state changes and idempotent handoffs. Replay separates authoritative effective time from event ingestion time. See [architecture](docs/architecture.md) and [integration contract](docs/integration-contract.md).

The policy, replay, matching, confirmation boundary, state sharing and financial calculations run as code. Authentication is only represented by a clearly labelled synthetic account context. Account, event and contact services, support logging, provider handoffs, plans and payments are local simulations. There are no live sends, debits, AI model calls or saved partial plans. Contextual templates and the fixed disclosure placeholder require human compliance approval before any real pilot. The demo stop control is local to a session.

Sessions expire after inactivity and disappear on restart. This is a single-node demonstration with no durable queue, production authentication or distributed send guarantee. A production pilot needs source-service integration, delivery idempotency, compliance approval, named operational ownership, privacy decisions and production observability. Future creditor flexibility and affordability integrations are outside this investment.

## Evidence and AI use

The eight interviews concern incomplete-plan consumers only. Cohort conversion differences do not establish causality. The pilot must measure incremental 30-day settled cash per randomised consumer, costs, complaints, opt-outs and later repayment quality. Four weeks is a launch horizon; mature outcomes arrive later.

Codex assisted with source digestion, architecture comparison, implementation, tests, commercial analysis and drafting. Human decisions and synthetic assumptions remain identified. [Build log](docs/build-log.md), [discovery](docs/discovery.md) and [assumptions](docs/assumptions.md) record the choices and remaining work.

At initialization, npm reported five high-severity findings in the development-only ESLint chain through `braces`, `micromatch` and `fast-glob`. No compatible patched `braces` release was offered. The production dependency audit reported zero findings. We did not apply npm's suggested unrelated framework-major downgrade.
