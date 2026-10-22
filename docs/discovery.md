# Why test conversational resolution?

The [original brief](../brief/01_candidate_brief.md), [supporting pack](../brief/02_supporting_pack.md) and [historical CSV](../brief/03_historical_cohorts.csv) control the evidence. The user supplied the [V1 direction](master-project-brief.txt) and subsequent [V2 request](v2-project-brief.txt). All supporting-pack research, economics and system details are synthetic. The product thesis below is a proposal, not an existing InDebted capability.

## How the thesis developed

Composer personalises outbound content within a fixed journey. It cannot currently use a click, authenticated visit or incomplete plan to change that journey. Our initial thought was an abandoned-plan follow-up. That is understandable, but the 2,000-person incomplete-plan cohort is small and half already pay within 30 days. A reminder alone would not solve unsuitable dates or affordability.

The wider engaged opportunity covers 18,000 consumers with clicks, authenticated visits or incomplete plans. These are exclusive t0 cohorts, not funnel steps. They already produce 4,600 payers and $820,000 settled cash under the existing journey. Historical differences do not establish that engagement causes payment or that another contact helps.

The interviews suggested payday-aware assistance, interruption recovery and account clarification. Three of eight incomplete-plan interviewees wanted a different first date; two described interruption; two had account questions; one wanted time to review household expenses. Of 50 selected support conversations, 12 concerned dates, nine account questions and seven resumption. These are useful hypotheses, not prevalence estimates. Record the need and match only existing approved options. If none fits, offer help rather than invent terms.

Portal guidance can address those needs after authentication, but misses consumers who leave and never return. Outbound orchestration can bring them back, but still requires the system to guess what they need. The V2 proposal lets a consumer state that need in a two-way conversation and opens a focused authenticated task when needed. A session can retain explicit preferences and, as a new capability, an unconfirmed draft. Neither an inbound message nor a plan-start event is permission to contact, an agreement or evidence of ability to pay.

This evolves the original reasoning. The same policy engine, current source-state checks, approved options and settled-cash outcome remain. Conversation changes how the need becomes visible. JIT tasks change how the consumer completes a relevant action. Both introduce infrastructure, security, content and support dependencies that a broader product pitch must not hide.

## Alternatives and trade-offs

| Option | Reason to consider it | Main limitation | Decision |
| --- | --- | --- | --- |
| Portal-only guidance and barrier measurement | Small change using existing authentication and approved options | Reaches people who return and authenticate; does not solve re-engagement | Strongest lower-complexity fallback. Cost it in week one. |
| Outbound orchestration with approved templates | Reuses scheduled contact infrastructure and can replace irrelevant reminders | Still one-way; intent is inferred and coordination adds risk | Credible diagnostic if inbound cannot be approved. Preserve all contact rules. |
| Incomplete-plan reminder | Observable trigger and closest match to interview sample | Only 2,000 consumers; 50% already pay; does not explain abandonment | One use case, not proof of a platform opportunity. |
| Two-way conversation plus JIT tasks | Captures explicit needs and connects them to a useful action | Inbound SMS, session persistence and new authentication are not established by the pack | Fund staged learning, conditional on week-one prerequisites. |
| Saved draft alone | Directly addresses interruption in two interviews | New persistence capability; unknown incremental benefit | Demonstrate bounded save/resume, include in pilot only if feasible. |
| US Composer rollout | Existing product can personalise copy | No US approval, approved prompt set or causal evidence | Keep generated outbound content sandbox-only. |
| Change creditor terms | Could address unsuitable dates or affordability | Requires separate creditor agreement | Exclude from the four-week pilot; record unmet needs. |
| Activate no-engagement and open-only cohorts | Larger population of 82,000 | Little evidence of barriers; opens are weak signals | Further discovery before expansion. |
| Existing journey | Avoids build cost and new failures | Leaves friction unresolved and learns little about barriers | Randomised control and fallback if investment gates fail. |

## What would overturn the recommendation?

Relevance may be the wrong problem. Consumers may mainly need financial flexibility or different creditor terms. SMS-reachable share, willingness to reply and causal lift are unknown. Conversation also creates costs for people who receive help but never pay. At the illustrative 60% SMS reach and 30% reply rate, only 3,240 of 18,000 consumers converse. A +1 to +5-point responder-lift range produces about -$2,791 to $32,702 annual contribution before build under the stated new costs. This is scenario arithmetic, not a forecast or confidence interval. Do not make the case look better by treating responders as a random sample or by calling three points conservative.

The full-reach +3-point scenario still gives about $148,000 annual contribution before new costs. It is a useful upper-delivery sensitivity, not proof of an attractive investment. Test reach, support demand and cash per assigned consumer before expanding. A $50,000 cap is a spending ceiling, not a requirement to use all 40 engineer-days.

Week one should establish whether a limited inbound workflow can operate with approved US content, an acceptable identity approach and human support. If it cannot, switch to a constrained diagnostic or defer production. Do not claim a four-week launch of an autonomous conversational collector. After a successful combined test, compare the lower-complexity alternative to establish whether conversation earns its extra cost.

[DECISION.md](../DECISION.md) contains the investment gates. [Assumptions](assumptions.md) names validation priorities. The [commercial model](commercial/README.md) separates evidence, delivery assumptions and incremental value.
