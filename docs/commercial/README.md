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

No lift, with the reference support cost, loses $15,552 a year before the build. The formulas, the full-reach sensitivity, and the one-change downside cases are in [Original model reference scenarios](#original-model-reference-scenarios).

The two-way assistant adds a reply funnel and its own message and model costs. That extension is below. It does not replace this case, and the two results are not added together.

| Model | Question and denominator | Implementation and inputs |
| --- | --- | --- |
| Original reach/lift model | What if a fraction of the 18,000 encounter the intervention? Lift is among those reached. | Backend Economics and independent [model.py](model.py), [inputs](assumptions.json) and [saved cases](scenarios.csv). |
| Conversational extension | What if only the people who can receive SMS, and then reply, are affected? Lift is among replies. | UI calculation checked against [conversation_model.py](conversation_model.py), [inputs](conversation-assumptions.json) and [saved cases](conversation-scenarios.json). |

The [historical CSV](../../brief/03_historical_cohorts.csv) and [supporting pack](../../brief/02_supporting_pack.md) supply the baselines and the unit costs. The [V1 request](../master-project-brief.txt) and [V2 request](../v2-project-brief.txt) supply proposed directions, not measured effects.

## V2 conversational extension

The Financial Model preserves the original model and adds this independent conversational sensitivity. It does not silently treat the original effective-reach assumption as both SMS availability and reply rate. The extension inherits the calculated population, cohort mix, marginal-payer cash multiplier and investment from the original screen. Its own inputs are SMS-reachable share, reply rate, absolute conversion lift among responders, AI turns and hypothetical cost, net extra SMS, added support and avoided support. Support savings default to zero. The saved Python cases reproduce the default 18,000-person cohort mix.

```sh
python3 docs/commercial/conversation_model.py
python3 docs/commercial/conversation_model.py --check
node --experimental-strip-types docs/commercial/check-conversation-ui.mjs
```

Inputs are in [conversation-assumptions.json](conversation-assumptions.json); saved results are in [conversation-scenarios.json](conversation-scenarios.json). The standard-library script checks the baseline, arithmetic, zero reach and response, conversion caps, invalid costs and output freshness. It leaves the earlier model and generated files unchanged.

```text
SMS reachable = engaged population × eligible SMS-reachable share
responders = SMS reachable × response rate
extra payers_i = responders × cohort share_i × min(responder lift, remaining conversion headroom_i)
extra cash = sum(extra payers_i × historical cash per payer_i × payer cash multiplier)
contribution = cash × 15% - cash × 2%
               - responders × net extra SMS × $0.035
               - responders × AI turns × hypothetical turn cost
               - responders × added support rate × $6
               + responders × avoided support rate × $6
annual contribution = contribution × 12 equivalent new intakes
simple payback = investment / contribution, when positive
```

These costs are incremental to control. The starting SMS is assumed to replace an existing scheduled contact without a net send increase; the extra-send input captures subsequent service replies after any verified displacement savings. Costs for non-responders, content approval, human review, provider setup, maintenance and infrastructure are not supplied and require a delivery estimate. Do not subtract the earlier model's support and communication costs again. They describe a separate scenario, not an additional cost layer.

The editable $0.01 AI-turn placeholder is hypothetical. The source's $0.012 applies to Composer draft/review attempts and has not been validated for a multi-turn assistant. Four assumed turns should include the chosen review/retry allowance; production estimates must measure actual attempts and oversight. The UI uses no live model and incurs no provider costs.

Reference inputs are 60% SMS reach, 30% reply rate, four net extra SMS and four AI turns per responder, two additional support conversations per 100 responders, no avoided support, unchanged historical payer cash and $50,000 build. All are assumptions except the exercise unit costs and historical cash proxy. Do not call them conservative.

| Hypothetical responder lift | Extra cash per intake | Annual contribution before build | Simple payback |
| --- | ---: | ---: | ---: |
| 0 points | $0 | -$11,664 | None |
| +1 point | $5,688 | -$2,791 | None |
| +3 points | $17,064 | $14,956 | 40.12 intakes |
| +5 points | $28,440 | $32,702 | 18.35 intakes |
| +10 points, speculative | $56,880 | $77,069 | 7.79 intakes |

The +1 to +5-point range is sensitivity, not a forecast or confidence interval. At +3 points, 10,800 SMS-reachable consumers become 3,240 responders and 97.2 additional expected payers. Fees are $2,559.60, payment costs $341.28, SMS $453.60, hypothetical AI $129.60 and support $388.80, giving $1,246.32 per intake. No-lift losses illustrate that help and conversation cost money even without collections gains. Other benefits such as reduced confusion may matter but are unpriced here.

A lift among responders has a different denominator from the earlier reached-consumer model. Under a simplifying constant-effect assumption, +3 responder points at 60% reach and 30% replies corresponds to +0.54 points across the assigned population. Responders are self-selected and may have a different baseline, cash value and treatment response. This bridge cannot establish causal lift. The experiment's primary metric remains treatment-control 30-day net settled cash per randomised consumer, with non-responders and later suppressed accounts retained. Exposure, reply rate and support use are diagnostics.

The full-reach +3-point result of $147,888 annual contribution before other costs remains an original sensitivity. It does not pass through this response-rate funnel and is not the conversational forecast. Production investment should use verified reach and costs, mature randomised cash evidence and a comparison with the lower-complexity alternative.

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

## Measurement and limits

Randomise at t0 by consumer and stratify C2-C4. Analyse treatment-control 30-day net settled cash per assigned consumer, subtract actual incremental costs and retain later suppressed consumers in their original arm. Report exposure separately. Do not estimate a causal effect by comparing reached consumers with people who did not engage.

The planning calculation uses a two-proportion normal approximation, 80% power, two-sided 5% alpha, equal allocation, source paid baseline 25.56% and a 1.8-point assigned effect. It returns 18,852 total consumers for the illustrative +3-point reached lift at 60% reach. This is a paid-outcome planning proxy for the reference mix, not proof the cash outcome is powered. It does not account for operational loss, sequential monitoring or multiple segment claims. This 1.8-point assigned effect belongs to the original reach model. The V2 reply funnel implies a different effect and needs new sizing. The source lacks cash variance. Obtain individual-level pilot outcomes and estimate cash uncertainty before committing to an efficacy sample size. Four weeks gets the pilot launched; final 30-day outcomes mature later. Follow 60/90-day cash and adherence before treating acceleration as durable value.

Historical reconciliation and scenario arithmetic are checked by the script, including zero reach, zero lift, payment ceilings, fading lift, non-finite input rejection and saved-output freshness. This is the complete financial-model validation scope. Real scale, causal lift, consumer safety and technical operation require separate verification.

## Two-page decision-note export

The submission source is [DECISION.md](../../DECISION.md). A checked A4 export is [DECISION.pdf](../../output/pdf/DECISION.pdf), with 11-point body type. To rerender after edits, use a Python environment with `reportlab` and `pypdf` installed:

```sh
python3 docs/commercial/render_decision.py
```

The renderer fails if the note exceeds two pages. Inspect rendered pages after changing the source; a page-count check alone cannot detect clipped text or poor spacing. PDF export dependencies are separate from the standard-library financial model.
