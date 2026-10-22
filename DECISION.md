# Adaptive Resolution: fund a bounded test

22 October 2026 · Investment recommendation · Synthetic exercise, all amounts USD

## The investment and consumer problem

Approve a four-week launch effort capped at $50,000, with a week-one checkpoint before committing the balance. Test whether consumer-led portal guidance plus contextual replacements of scheduled messages creates additional settled cash. The cap covers 40 engineer-days and shared design/compliance. Broad rollout requires evidence, human compliance approval and final integration verification.

Interest does not mean readiness or ability to pay. An incomplete plan may reflect interruption, unsuitable dates, account questions or affordability. Offer approved options, help or time to review without treating engagement as permission or commitment.

## Cohort, evidence and uncertainty

Three exclusive cohorts with a click, authenticated portal visit or incomplete plan contain **18,000 consumers** per historical 30-day intake, with no active plan or pending payment at t0. They produced 4,600 payers and $820,000 settled cash. Paid conversion was 25.56%. These are fixed cohorts, not funnel steps.

Baseline contribution before other costs was $106,600 at 13%. No intervention ran. Recurring intakes are an exercise assumption; US scale and reach remain unverified. Clicks do not establish authentication.

Eight incomplete-plan interviews reported dates in three, interruption in two, account questions in two and budget concerns in one. Among 50 support conversations, 12 concerned dates, nine account questions and seven resumption. These samples cannot establish prevalence. The biggest falsifying assumption is that relevance solves enough barriers. Affordability or creditor terms may dominate.

## Alternatives and commercial hypothesis

Portal-only guidance is the strongest alternative and may deliver most of the benefit without outbound coordination. Switch if contact changes add cost or harm without cash. Plan-abandonment reminders target only 2,000 consumers, half of whom already pay. US Composer lacks approval and causal evidence. Low-engagement activation has scale but weak problem evidence. [Discovery](docs/discovery.md) records the trade-offs.

At 60% reach, hypothetical +1 to +5-point lifts span $14,026 to $132,336 annual contribution before build, with 4.5 to 42.8-month payback. This is a scenario range, not a forecast or confidence interval. No lift loses $15,552 annually before build. Ten points is speculative.

Assume equal cohort lift, 2% additional support conversations at $6, zero net send cost from template replacements, no Composer and twelve new intakes. Historical $170/$180/$190 cash per payer is a marginal-cash proxy.

| Lift among reached | Extra cash per intake | Annual contribution | Simple payback |
| --- | ---: | ---: | ---: |
| +1 point | $18,960 | $14,026 | 42.8 months |
| +3 points | $56,880 | $73,181 | 8.2 months |
| +5 points | $94,800 | $132,336 | 4.5 months |
| +10 points, speculative | $189,600 | $280,224 | 2.1 months |

At +3 points, $8,532 fees less $1,138 payment and $1,296 support costs give $6,098 per intake on 10,800 reached. First-year net after build is only $23,181 before unknown costs. Halving reach or payer cash gives 16.4 or 20.8-month payback. [Model](docs/commercial/README.md).

<!-- pagebreak -->

## Smallest test and AI autonomy

Propose a portal interaction that records stated needs, displays approved options and routes questions to support. Replace eligible queued contacts with contextual templates, without increasing reminder frequency. Exclude creditor-term changes, saved-plan resumption, banking connections and autonomous payments. This combined test cannot isolate each component's effect; a later portal-only comparison must justify outbound coordination.

The local demo executes replay, contact policy, matching and explicit confirmation. Authentication, account services, delivery, support and payments are simulated; no live sends, model calls or debits occur. AI has no independent consumer-facing decision authority. Use US templates and deterministic eligibility, timing and contact-budget rules. AI cannot decide legal scope, infer affordability, change terms, confirm a plan or debit funds. Consumers confirm agreements. Future Composer use requires separate approval and evaluation. AI assisted code, analysis, drafting and checks; the candidate owns the recommendation.

## Four-week launch and experiment

Week 1: validate barriers, cost the portal-only alternative, confirm scope, support capacity, approved content, metrics and stop ownership. Week 2: prepare assignment, source-state checks, coordination and audit requirements. Week 3: validate the connected journey and measurement. Week 4: complete safety review, launch a capped canary and inspect before ramping. Four weeks is the launch horizon, not mature efficacy evidence.

Randomise consumers 1:1 at t0, stratified by cohort. Keep assignment stable and analyse everyone assigned, including later suppressed consumers. Control receives the existing journey; treatment receives the combined intervention. Log actual exposure, eligibility, sends and replacement savings separately. Never select the outcome sample by post-assignment exposure.

Measure treatment-control 30-day net settled cash per assigned consumer, apply the 13% margin and subtract actual incremental costs. Report uncertainty. Paid conversion, confirmed plans, intent capture and seven-day payments are secondary or early signals. Follow 60/90-day cash and plan adherence to distinguish additional repayment from acceleration or unsustainable commitments.

A rough 80%-power, two-sided 5% paid-conversion calculation needs 18,900 consumers for a 1.8-point assigned effect, equivalent to +3 points among 60% reached. Cash variance is unavailable. Estimate it before fixing the cash sample size. Complete 30-day windows plus next-day reporting before efficacy review.

## Safety and expand/change/stop gates

A named human owner can stop sends. Before provider handoff, require current authoritative scope, permissions, account state, local timing and shared-budget checks. Unknown required state blocks outreach. Suppress for payments, active plans and holds. Preserve disclosures and consumer confirmation. Support operates weekdays. Specialists must confirm jurisdiction applicability, notices, creditor restrictions, disputes, vulnerable-consumer handling and intent-data retention. These are release requirements, not legal conclusions.

Expand only if safe, mature randomised evidence gives a conservative contribution estimate supporting payback within 12 months at verified reach and costs. Reference hurdles are about +2.22 points among reached, or 41% reach at +3 points. These are conditional investment thresholds. Validate recurring scale and sustainability.

Change if reach is low, support is overloaded or affordability and terms dominate. If uncertainty spans the hurdle, permit one extension with a fixed sample, budget and decision date. Pause for prohibited contact, disclosure failure, unauthorised terms/payment or serious harm. Investigate complaint increases above 0.10 points or opt-out increases above 0.50 points versus control; these proposed triggers do not prove safety below them. Stop for recurring failures, uncontrolled harm or a sufficiently precise upper contribution estimate below the 12-month hurdle.
