# Why test Adaptive Resolution?

This records the commercial choice, not implemented capability. The [original brief](../brief/01_candidate_brief.md), [supporting pack](../brief/02_supporting_pack.md) and [historical CSV](../brief/03_historical_cohorts.csv) control the evidence. The [master brief](master-project-brief.txt) supplies a working direction that remains open to challenge. All research, cohort data and unit costs in the supporting pack are synthetic.

## Evidence and interpretation

The three exclusive engaged cohorts contain 18,000 consumers per example intake. They are an addressable sizing pool, not 18,000 reachable US users or 18,000 unresolved non-payers. Under the existing schedule, 4,600 already pay within 30 days. Higher engagement correlates with higher paid conversion, but does not establish that engagement or follow-up causes payment.

The eight interviews cover incomplete-plan consumers only. Dates, interruption, account questions and budget uncertainty suggest different barriers. The 50 support conversations provide another selected sample, not population rates. Neither source establishes that an additional message is the remedy. The 12 scenario fixtures illustrate behaviour and must never estimate prevalence.

## Alternatives considered

| Option | Reason to consider it | Main limitation | Decision |
| --- | --- | --- | --- |
| US Composer rollout | Broad content relevance using an existing product | No US approval, prompt evaluation or causal results. Copy alone may not solve the barrier. | Defer to a separate approval and evaluation case. |
| Incomplete-plan reminder | Observable signal and closest match to interview evidence | Only 2,000 per intake, 50% already pay. Does not itself solve affordability or dates. | One use case, not justification for a broad platform. |
| Portal-only guidance and barrier measurement | Addresses explicit needs without new outbound decisions | Reaches people who authenticate. May miss interrupted consumers who do not return. | Strongest alternative and lower-complexity fallback. Obtain a real estimate in week one. |
| Save and resume incomplete plans | Directly addresses interruption in two interviews | Persistence does not exist today, and no prevalence or incremental cash evidence is supplied. | Separate later test, not a claimed pilot benefit. |
| Change repayment terms | Could address unsuitable dates and affordability | Requires creditor agreement beyond the four-week scope. | Record unmet needs and escalate. Do not invent terms. |
| Activate no-engagement and open-only cohorts | 82,000 consumers create a larger sizing pool | Little evidence of why they do not engage. Opens are a weak signal. | Further discovery before expansion. |
| Adaptive Resolution | Joins explicit portal choices with contextual scheduled replacements across C2-C4 | Greater coordination and safety burden. Combined test cannot attribute gains to each component. | Fund a capped learning test, conditional on week-one review. |
| Keep the current journey | Avoids build cost and new failure modes | Leaves observed friction unresolved and learns little about barriers. | Valid control and fallback if economics or safety fail. |

## Decision and the assumption that could overturn it

The hypothesis is that consumer-led guidance and a more relevant scheduled follow-up create enough additional settled cash to justify the extra work. The largest risk is that the missing ingredient is financial flexibility, not relevance. At 60% reach and reference costs, hypothetical +1 to +5-point lifts span $14,026 to $132,336 annual contribution before build and 4.5 to 42.8-month simple payback. This is a scenario range, not a forecast or confidence interval. No lift loses $15,552 annually before build. The +3-point reference leaves only $23,181 first-year net before unknown operating costs. This is a thin case for rollout and a reason to stage the learning investment.

Protect the counterfactual. Test the combined journey against the existing experience first. If it earns further investment, compare portal-only against portal plus contextual replacements to establish whether coordination deserves its cost. No causal claim about Composer follows from this test.

The four-week allocation is a cap, not an instruction to consume all 40 engineer-days. At the week-one checkpoint, compare a delivery estimate and learning value for the combined intervention with portal-only. Switch to portal-only if the extra coordination cannot be approved, bounded or measured. Do not invent a cheaper cost estimate merely to make that option win.

[DECISION.md](../DECISION.md) contains the recommendation and gates. [Assumptions](assumptions.md) identifies validation priorities. The [commercial model](commercial/README.md) separates historical baseline, exercise prices and hypothetical incremental value. Technical implementation and simulation claims belong to final integration verification.
