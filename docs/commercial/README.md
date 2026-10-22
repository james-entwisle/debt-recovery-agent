# Commercial reasoning and reproducible models

The business hypothesis is unchanged by the move to a two-way assistant. Improving the 30-day settled-payment conversion of the engaged consumers can produce incremental retained contribution against the existing fixed journey. A controlled pilot has to show whether it does. The assistant and the just-in-time tasks are the way we would try to move people onto a confirmed plan and a settled payment. They are not a new commercial model. [DECISION.md](../../DECISION.md) owns the recommendation. This guide owns the cohorts, the unit costs, and both calculations. All amounts are USD. All evidence is synthetic.

## The 100,000 and the 18,000

One synthetic intake is 100,000 people. The five cohorts are mutually exclusive. They are not steps in a funnel. Counts and cash are from [03_historical_cohorts.csv](../../brief/03_historical_cohorts.csv).

| Cohort | Consumers | Paid by 30 days | Settled cash by 30 days |
| --- | ---: | ---: | ---: |
| No observed engagement | 60,000 | 4,200 | $630,000 |
| Tracked open only | 22,000 | 2,200 | $330,000 |
| Tracked click only | 10,000 | 1,800 | $306,000 |
| Portal visit, no plan start | 6,000 | 1,800 | $324,000 |
| Plan started, incomplete | 2,000 | 1,000 | $190,000 |
| **Total** | **100,000** | **11,000** | **$1,780,000** |

The base target is the last three rows.

| Engaged cohort | Consumers | Payers | Paid conversion | Settled cash |
| --- | ---: | ---: | ---: | ---: |
| Click only | 10,000 | 1,800 | 18% | $306,000 |
| Portal visit, no plan start | 6,000 | 1,800 | 30% | $324,000 |
| Plan started, incomplete | 2,000 | 1,000 | 50% | $190,000 |
| **Combined** | **18,000** | **4,600** | **25.56%** | **$820,000** |

At 13% of settled cash, that baseline is **$106,600** of contribution before messaging and support. It is cash the current journey already collects.

We use the 18,000 rather than only the 2,000 who left a plan unfinished because a click or a visit is already a signal the fixed schedule does not use, and 2,000 people is too small to be the whole opportunity. Half of those 2,000 already pay within 30 days. Engagement is a reason to offer a next step. It does not prove what the person needs, and it does not prove that a better step will cause more cash. The other 82,000 are a later expansion, not this case.

## Unit economics

From [02_supporting_pack.md](../../brief/02_supporting_pack.md).

| Input | Value |
| --- | --- |
| Retained collections fee | 15% of settled cash |
| Variable payment cost | 2% of settled cash |
| Contribution margin | 13% of incremental settled cash |
| Email | $0.003 per send |
| SMS | $0.035 per send |
| Composer draft and review | $0.012 per attempt, including rejections |
| Extra support conversation | $6 |
| Build cap | $50,000: 40 engineer-days at $1,000, plus $10,000 design and compliance |

A confirmed plan earns no fee. The fee starts when cash settles. The investment case below is a higher paid-conversion rate among people who encounter the intervention, priced at the historical cash per payer: $170 after a click, $180 after a visit, $190 after an unfinished plan.

## Original investment case

Assume 18,000 engaged consumers each intake and 60% of them encounter the intervention. Lift is an absolute increase in paid conversion among those people. The reference deducts two extra support conversations per 100 reached consumers and treats the new message as a replacement for a scheduled one, so the send cost nets to zero. Twelve new intakes make a year. The +3-point row is the arithmetic reference, not a forecast.

| Hypothetical reached lift | Extra cash per intake | Annual contribution before build | First-year net after $50,000 | Simple payback |
| --- | ---: | ---: | ---: | ---: |
| +1 point | $18,960 | $14,026 | -$35,974 | 42.8 months |
| +3 points | $56,880 | $73,181 | $23,181 | 8.2 months |
| +5 points | $94,800 | $132,336 | $82,336 | 4.5 months |
| +10 points, speculative | $189,600 | $280,224 | $230,224 | 2.1 months |

No lift, with the reference support cost, loses $15,552 a year before the build. The formulas, the full-reach sensitivity, and the one-change downside cases are in [Original model reference scenarios](#original-model-reference-scenarios).

## Interactive cohort progression model

The Financial Model starts with the original 18,000 and lets the reader select all three engaged cohorts, click-only consumers, portal visitors without a start, or incomplete plans. Change the population, effective encounter rate and current/adaptive graduation rates. The model shows additional portal arrivals, starts, confirmations, first plan payments, settled cash, contribution and payback. The original paid-lift model remains available as a separate comparison; do not add its returns to the progression model.

The source cohorts are exclusive starting populations. The calculator's sequential paths are **assumptions**, not transitions measured by the historical table. A portal visitor has already reached the portal; an incomplete-plan consumer has already started. Those gates are skipped for the appropriate entry cohorts.

| Entry cohort | Current assumed path | Adaptive assumed change |
| --- | --- | --- |
| Click only | 50% arrive × 40% start × 50% confirm × 70% first payment | Arrival becomes 71.4286%; subsequent rates unchanged |
| Portal, no start | 50% start × 30% confirm × 70% first payment | Start becomes 64.2857%; subsequent rates unchanged |
| Incomplete plan | 30% confirm × 70% first payment | Confirmation becomes 34.2857%; subsequent rate unchanged |

Current confirmation-rate products match the historical cohort confirmation rates, but the intermediate transitions and first-payment rates are unmeasured. These illustrative adaptive rates reproduce exactly the original +3-point paid-lift arithmetic in each reached cohort. They are a calibration, not an independent estimate or forecast. Historical one-off payments are outside this modelled plan path. More plan payments may substitute for payments that would happen anyway; the editable genuine-incrementality assumption tests that risk.

At 60% encounter, 10,800 consumers enter the modelled paths:

| Milestone | Current illustration | Adaptive illustration | Additional people |
| --- | ---: | ---: | ---: |
| Portal reached, including those already there | 7,800 | 9,085.71 | 1,285.71 |
| Plan started, including existing incomplete starts | 4,200 | 5,228.57 | 1,028.57 |
| Plan confirmed | 1,500 | 1,962.86 | 462.86 |
| First plan payment settled | 1,050 | 1,374 | 324 |

```text
reached_i = selected population × source cohort mix_i × effective encounter
current plan payers_i = reached_i × product(current rates for remaining gates_i)
adaptive plan payers_i = reached_i × product(adaptive rates for remaining gates_i)
additional payers_i = (adaptive - current) × genuine incrementality
additional cash = sum(additional payers_i × historical cash per payer_i × cash multiplier)
contribution = additional cash × (15% - 2%)
               - reached × extra support conversations per reached × $6
               - reached × net extra SMS per reached × $0.035
               - reached × AI turns per reached × hypothetical turn cost
               - other recurring costs
annual contribution = contribution × 12 equivalent new intakes
simple payback = investment / contribution, if positive
```

Additional payers are bounded by historical paid-conversion headroom; negative progression is also allowed. The default assumes 100% of extra plan payers are genuinely additional, unchanged historical marginal cash, two extra support conversations per 100 reached, net-zero replacement sends, no AI turns and no other recurring cost. These reproduce the original illustration; zero unpriced costs do not establish production economics. The hypothetical $0.01 AI-turn input is not the pack's $0.012 Composer attempt cost. Count retries, reviews, provider setup, oversight, infrastructure and ongoing maintenance in a delivery estimate. No support savings are credited.

The reference gives $56,880 additional cash, $8,532 retained fees, $1,137.60 payment costs and $1,296 support costs per intake: **$6,098.40 contribution**. Annual contribution is $73,180.80; first-year net after build is $23,180.80. Halving genuine incrementality or marginal cash reduces annual contribution to $28,814.40 and extends payback to 20.82 months. No progression improvement loses $15,552 annually before build. Conversation is the proposed mechanism; reply rate is a diagnostic, not a second filter silently applied to the original effective-reach assumption.

Reproduce the progression model independently from the CSV:

```sh
python3 docs/commercial/conversation_model.py
python3 docs/commercial/conversation_model.py --check
node --experimental-strip-types docs/commercial/check-conversation-ui.mjs
```

[Inputs](conversation-assumptions.json), [saved cases](conversation-scenarios.json), [Python model](conversation_model.py) and [UI parity check](check-conversation-ui.mjs) cover twelve cases, including individual cohorts, zero reach, no improvement, worse progression, smaller payments, lower incrementality and added conversation costs. The check compares the UI calculation's source snapshot and outputs with the CSV and independent Python calculation. It does not establish causal impact or verify delivery capabilities.

## Reproduce the original model

Python 3.9 or later, standard library only. From the repository root:

```sh
python3 docs/commercial/model.py
python3 docs/commercial/model.py --check
```

Edit [assumptions.json](assumptions.json) without changing formulas, then regenerate. For a separate case, copy the JSON, edit it and run:

```sh
python3 docs/commercial/model.py --assumptions /absolute/path/case.json --output-dir /absolute/path/results
```

The outputs are [historical.csv](historical.csv), [scenarios.csv](scenarios.csv), [sensitivity.csv](sensitivity.csv) and [evidence.json](evidence.json). Empty payback cells mean no payback under that definition. Evidence includes the original CSV SHA-256. `--check` verifies source consistency, arithmetic and boundary cases, then compares regenerated outputs with saved files. It does not run app tests or validate technical implementation.

## Historical observations

Five unique, complete cohort rows cover 100,000 consumers, one account each, with a complete 30-day outcome window. The source has no missing values or duplicate cohort IDs. Source constraints and payment-plan overlaps are checked. Aggregation cannot verify underlying consumer-level records.

C2-C4 contain 18,000 consumers, 4,600 payers and $820,000 net settled cash. Paid conversion is 25.5556%. The 2,500 confirmed plans overlap with 1,800 payers, so paid or plan is 5,300, or 29.4444%. There are 202 opt-outs, or 1.1222%, and 30 complaints, or 0.1667%. These are descriptive rates across everyone in the cohorts, not pilot guardrails or measures of harm caused by an intervention.

All five cohorts collected $1,780,000, giving $231,400 at the 13% fee-minus-payment-cost margin. The engaged cohorts give $106,600. Neither amount is incremental value. The 13,400 engaged consumers who did not pay within 30 days are not evidence that all can be converted.

The three cohorts are mutually exclusive at t0. Do not add them as funnel steps or migrate people between them when later events arrive. Interviews cover eight incomplete-plan consumers only. The scenario JSON is illustrative and is never used to infer rates.

## Original model formulas and definitions

For cohort i, let N be the assumed recurring engaged population, w its mix share, r its effective reach, L the absolute paid-conversion lift among reached consumers, and P the source cash divided by source payers.

```text
cohort population_i = N * weight_i / sum(weights)
reached_i = cohort population_i * effective_reach_i
additional payers_i = reached_i * min(L, 1 - historical paid rate_i)
additional cash_i = additional payers_i * P_i * incremental payer cash multiplier
retained revenue = additional cash * 15%
payment cost = additional cash * 2%
net communications = added sends at channel cost - displaced sends at channel cost
Composer cost = all draft/review attempts, including rejections, * $0.012
support cost = reached consumers * added conversations per reached consumer * $6
contribution = retained revenue - payment cost - net communications
               - Composer cost - support cost - other recurring costs
annual contribution = sum of contribution over 12 new equivalent intakes
first-year net after investment = annual contribution - one-off build cost
simple run-rate payback = investment / first-intake contribution, if positive
```

Effective reach is the joint fraction who remain eligible and encounter the intervention, counted once per consumer. It includes the portal and approved contextual contact path. It is an assumption, not a measured delivery rate. The reference applies 60% in every cohort. Cohort-specific reach and weights can change independently, since a click is weaker than an authenticated visit. Actual reach composition may also change the payment proxy.

L is an absolute percentage-point difference among reached consumers. Three points on an 18% baseline means 21%, not 18.54%. At 60% reach, +3 points translates to an illustrative 1.8-point difference across all assigned consumers. This scaling assumes unexposed consumers have no effect and reached consumers retain the source baseline. The experiment must estimate the assigned effect directly, without selecting on post-assignment exposure.

P is $170 for C2, $180 for C3 and $190 for C4, derived from cash divided by payers. It is not average debt, full repayment or observed incremental payer value. The multiplier tests a smaller marginal payment. A lift is capped so no cohort exceeds 100% paid conversion. Expected counts can be fractional.

Each annual period is an equivalent 30-day intake, and twelve periods form a 360-day commercial year. This follows the brief's monthly convention rather than scaling by 365/30. There is no additional annual multiplier for plan instalments or existing consumers. Annual contribution excludes the initial build, while first-year net subtracts it once. Fixed company overhead, tax and discounting are excluded. Unknown incremental operating costs default to zero and must be estimated before expansion.

Persistence weights apply to the lift for each successive intake. Recurring support and contact costs continue for all twelve intakes. `payback_within_modelled_year_months` follows this contribution sequence and is blank when the build is not recovered. `simple_run_rate_payback_months` extends the full-effect run rate indefinitely and can exceed twelve months. It is misleading if lift later vanishes. Payback is measured in equivalent 30-day periods and assumes costs and cash accrue evenly within each period. It excludes build time, ramp and reporting delays, so is not a calendar cash-flow promise. A real pilot pays build costs while measuring only its assigned treatment arm; these scenarios describe full treatment deployment at the assumed scale, not pilot-year realised income.

## Original model reference scenarios

Hypothetical +1 to +5-point lifts span $14,025.60 to $132,336 annual contribution before build and 4.53 to 42.78-month simple payback. First-year net after the $50,000 build spans -$35,974.40 to $82,336. This is a scenario range, not a confidence interval or forecast. The +3-point case is an arithmetic reference, not a definitive estimate. The +10-point case is speculative, and no lift loses $15,552 annually before build at reference support costs.

All rows assume 18,000 engaged consumers per intake, 10,800 effectively reached, 216 additional support conversations costing $1,296 per intake, $50,000 investment and full persistence. One added email replaces one scheduled email per reached consumer. Each side costs $32.40 per intake, so net communication cost is zero. Composer attempts are zero. Equal SMS replacements also net to zero. Do not assume cancellations save money until reconciled with actual handoffs.

| Hypothetical reached lift | Additional payers | Extra settled cash per intake | Monthly contribution | Annual contribution | First-year net | Simple payback |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| +1 point | 108 | $18,960 | $1,168.80 | $14,025.60 | -$35,974.40 | 42.78 months |
| +3 points | 324 | $56,880 | $6,098.40 | $73,180.80 | $23,180.80 | 8.20 months |
| +5 points | 540 | $94,800 | $11,028.00 | $132,336.00 | $82,336.00 | 4.53 months |
| +10 points, speculative | 1,080 | $189,600 | $23,352.00 | $280,224.00 | $230,224.00 | 2.14 months |

At full reach, each one-point lift implies $31,600 extra settled cash. Three points imply $94,800 cash, $14,220 retained fees, $1,896 payment cost and $12,324 contribution per intake before other costs. Twelve intakes yield $147,888 before other costs. Ten points imply $492,960 annual contribution before other costs. Those figures do not use 60% reach or deduct support, and must not be presented as net returns.

## Original model downside and investment hurdles

Each case below changes one reference input at a hypothetical +3-point lift.

| Changed input | Annual contribution | Simple payback | Recovered in modelled year? |
| --- | ---: | ---: | --- |
| Recurring engaged population doubles to 36,000 | $146,361.60 | 4.10 months | Yes, hypothetical only |
| Reach falls to 30% | $36,590.40 | 16.40 months | No |
| Support rises to 5% | $49,852.80 | 12.04 months | No |
| Cash per additional payer halves | $28,814.40 | 20.82 months | No |
| Lift lasts six intakes, costs continue for twelve | $28,814.40 | Initial run rate is invalid after fade | No |
| One extra SMS per reached consumer | $68,644.80 | 8.74 months | Yes, hypothetical only |
| $2,000 other ongoing cost per intake | $49,180.80 | 12.20 months | No |
| No lift, with reference support costs | -$15,552.00 | None | No |

The volume case assumes twice as many new, non-overlapping eligible consumers every intake, unchanged lift and cash per added payer, linear variable costs and no additional build or fixed operating cost. Actual US scale is unknown. This is a scale sensitivity, not evidence that reach or economics will remain constant.

Under the reference assumptions, operating break-even requires about +0.53 points among reached consumers. The reference case creates only $23,180.80 first-year net before unknown operating costs, so it is a thin case for broader rollout. Recovering $50,000 within twelve intakes requires about +2.22 points among reached, or about 41.0% uniform reach at +3 points. These are proposed economic hurdles conditional on all other inputs, not predicted effects. Cash catch-up in the control arm can remove durable incremental value even if 30-day cash initially improves.

For **four-month payback**, $50,000 requires $12,500 contribution per intake. At 60% reach and $1,296 support cost, that requires $106,123.08 extra settled cash per intake: about 604.5 additional payers at the reference mix, or **+5.60 percentage points among reached consumers** (about +3.36 points across the full 18,000). The +5-point case falls short at 4.53 months. This hurdle assumes unchanged marginal payment value, genuinely incremental cash, sustained equivalent intakes and zero net extra messaging/model/other costs. Every additional $1,000 monthly cost raises the reached-lift hurdle by about 0.41 points. These are required conditions, not expected outcomes. Build time, ramp and settlement/reporting delays extend calendar recovery.

## Measurement and limits

Randomise at t0 by consumer and stratify C2-C4. Analyse treatment-control 30-day net settled cash per assigned consumer, subtract actual incremental costs and retain later suppressed consumers in their original arm. Report exposure separately. Do not estimate a causal effect by comparing reached consumers with people who did not engage.

The planning calculation uses a two-proportion normal approximation, 80% power, two-sided 5% alpha, equal allocation, source paid baseline 25.56% and a 1.8-point assigned effect. It returns 18,852 total consumers for the illustrative +3-point reached lift at 60% reach. This is a paid-outcome planning proxy for the reference mix, not proof the cash outcome is powered. It does not account for operational loss, sequential monitoring or multiple segment claims. This 1.8-point assigned effect belongs to the original reach model and the calibrated progression reference. Different graduation assumptions need new sizing. The source lacks cash variance. Obtain individual-level pilot outcomes and estimate cash uncertainty before committing to an efficacy sample size. Four weeks gets the pilot launched; final 30-day outcomes mature later. Follow 60/90-day cash and adherence before treating acceleration as durable value.

Historical reconciliation and scenario arithmetic are checked by the script, including zero reach, zero lift, payment ceilings, fading lift, non-finite input rejection and saved-output freshness. This is the complete financial-model validation scope. Real scale, causal lift, consumer safety and technical operation require separate verification.

## Two-page decision-note export

The submission source is [DECISION.md](../../DECISION.md). A checked A4 export is [DECISION.pdf](../../output/pdf/DECISION.pdf), with 11-point body type. To rerender after edits, use a Python environment with `reportlab` and `pypdf` installed:

```sh
python3 docs/commercial/render_decision.py
```

The renderer fails if the note exceeds two pages. Inspect rendered pages after changing the source; a page-count check alone cannot detect clipped text or poor spacing. PDF export dependencies are separate from the standard-library financial model.
