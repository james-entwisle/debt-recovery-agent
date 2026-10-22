# Why test conversational resolution?

The [original brief](../brief/01_candidate_brief.md), [supporting pack](../brief/02_supporting_pack.md) and [historical CSV](../brief/03_historical_cohorts.csv) control the evidence. The user supplied the [V1 direction](master-project-brief.txt) and subsequent [V2 request](v2-project-brief.txt). All supporting-pack research, economics and system details are synthetic. The product thesis below is a proposal, not an existing product capability.

## How the thesis developed

Composer personalises outbound content within a fixed journey. It cannot currently use a click, authenticated visit or incomplete plan to change that journey. Our initial thought was an abandoned-plan follow-up. That is understandable, but the 2,000-person incomplete-plan cohort is small and half already pay within 30 days. A reminder alone would not solve unsuitable dates or affordability.

The wider engaged opportunity covers 18,000 consumers with clicks, authenticated visits or incomplete plans. These are exclusive t0 cohorts, not funnel steps. They already produce 4,600 payers and $820,000 settled cash under the existing journey. Historical differences do not establish that engagement causes payment or that another contact helps.

The interviews suggested payday-aware assistance, interruption recovery and account clarification. Three of eight incomplete-plan interviewees wanted a different first date; two described interruption; two had account questions; one wanted time to review household expenses. Of 50 selected support conversations, 12 concerned dates, nine account questions and seven resumption. These are useful hypotheses, not prevalence estimates. Record the need and match only existing approved options. If none fits, offer help rather than invent terms.

Portal guidance can address those needs after authentication, but misses consumers who leave and never return. Outbound orchestration can bring them back, but still requires the system to guess what they need. The V2 proposal lets a consumer state that need in a two-way conversation and opens a focused authenticated task when needed. A session can retain explicit preferences and, as a new capability, an unconfirmed draft. Neither an inbound message nor a plan-start event is permission to contact, an agreement or evidence of ability to pay.

This evolves the original reasoning. The same policy engine, current source-state checks, approved options and settled-cash outcome remain. Conversation changes how the need becomes visible. JIT tasks change how the consumer completes a relevant action. Both introduce infrastructure, security, content and support dependencies that a broader product pitch must not hide.

Current experience principles are in [product philosophy](product-philosophy.md). This document preserves the evidence, evolution and alternatives behind them.

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

## Current decision: progression within the original cohort

The user's current direction retains the original 18,000-person scope. Conversation does not create value by itself. The test is whether it helps click-only consumers reach the portal, visitors start a plan, or incomplete-plan consumers confirm, followed by additional settled cash. The calculator therefore compares current and adaptive graduation rates at each cohort's actual entry point. The starting example is calibrated to the original +3-point paid-lift sensitivity, not inferred from the cross-sectional cohort table.

The 18,000 comprises 10,000 click-only, 6,000 portal-without-start and 2,000 incomplete-plan consumers. It does not mean 18,000 portal visitors. The remaining 82,000 accounts in the full intake are future discovery scope, not a denominator to inflate the current return. A separate 100,000-person expansion was considered and is not the default investment case.

At illustrative 60% encounter, the reference gives 324 extra payers, $56,880 extra cash and $73,181 annual contribution after assumed support costs, before build. This is the original commercial case expressed through graduation rates. The current/intervention transition rates are unmeasured. Halving incremental cash or the share who would not pay anyway gives 20.8-month payback. No progression improvement loses $15,552 annual support costs before build. Conversation costs must still be added when known.

The strongest alternative remains a smaller portal-only improvement. Validate barriers, approvals, costs and cash per randomised consumer before expansion. [DECISION.md](../DECISION.md) owns investment gates; [the commercial model](commercial/README.md) contains definitions, stage counts, assumptions and reproducible checks.
