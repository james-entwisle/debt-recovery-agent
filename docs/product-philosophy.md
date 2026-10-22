# Product philosophy

Adaptive Resolution helps an engaged consumer explain what they need and take an appropriate next step. Conversation captures the need; a just-in-time task makes the relevant action available. The showcase narrative is the [product vision](product-vision.md). This is the [V2 product hypothesis](v2-project-brief.txt), subject to the evidence and investment gates in [DECISION.md](../DECISION.md).

## Begin with the barrier

A click or incomplete plan signals interest without explaining the problem. Ask for the consumer's stated need before choosing an action. A payday preference, account question, interruption and hardship concern require different responses. The small interview sample supports testing these routes, not assuming everyone needs another reminder.

The key falsifier is straightforward: if affordability or creditor terms dominate, a better conversation may do little. Record unmet needs and compare improved portal guidance before adding more automation. [Discovery](discovery.md) explains the evidence and alternatives.

## Make a useful next step small

Keep the SMS response relevant and free of unverified financial detail. Open a focused task for account information, approved options, draft return, payment status or assistance. A consumer should not have to navigate a generic portal to rediscover the reason they arrived.

Retain explicit preferences so people do not repeat themselves. Save only an unconfirmed draft, explain its limits, and recheck current state when they return. A historic plan-start event does not contain saved progress. In this demonstration, restart or idle expiry loses the draft; durable return remains production work.

## Preserve choice and approved terms

Exploration creates no commitment. A draft creates no agreement. Review creates no debit. Confirmation must be explicit, and the approved terms must still match the account and preferences at that moment.

If the available options do not fit, offer help. Do not negotiate new dates, amounts or obligations to make the interface look successful. Assistance is a valid outcome, including when it produces no payment. Support operates weekday business hours; an immediate reply cannot be promised.

## Give rules and humans clear authority

| Decision | Owner |
| --- | --- |
| Recognise a bounded explicit intent, remember stated preferences, propose a response/task | Deterministic demo assistant. A future model would remain constrained by policy. |
| Determine outreach eligibility, timing, shared limits and approved-option matches | Backend rules using current authoritative account data. Unknown required state blocks outreach. |
| Confirm an arrangement or authorise a simulated payment | Consumer, through an explicit reviewed action and fresh backend checks. |
| Apply hardship/dispute holds, resolve uncertainty, approve US content and stop a real pilot | Authoritative account services and named human specialists. |

Hardship, disputes and reported payments route to help and pause collection prompts. Classification does not create a formal account hold. An inbound message never restores an opted-out permission or creates a new proactive-contact allowance. Requested service replies require their own approved handling; their budget exemption is not unlimited permission.

## Earn trust before reducing friction

Show account detail inside the JIT task only after its verification step. Keep link and session scope tied to the account and task, expire access and reject reuse. Phone-link possession is not proof of identity. The local checkbox simulates an identity check; a real mechanism needs security approval.

Make simulations visible. Separate the baseline preview, proposed reply, simulated response and suppressed action. Keep invented plans and inbound examples distinct from supplied evidence. The operator's ability to patch synthetic source state is a demonstration control, not a consumer permission.

## Measure resolved needs and additional value

Replies and plan starts help diagnose the journey. They do not prove consumer benefit or incremental revenue. Measure settled cash per randomised consumer, actual costs, complaints, opt-outs, support load and later adherence. Keep non-responders in the analysis and inspect whether early cash merely moves forward from later periods.

The commercial model deliberately shows weak and negative scenarios. Fund the smallest experiment that can challenge the thesis. Expand only when safety, mature outcomes and verified economics earn the next investment. [Commercial reasoning](commercial/README.md) contains the calculations; [assumptions](assumptions.md) names the missing evidence.
