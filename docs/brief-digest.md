# Brief digest

Prepared from the five supplied files on 22 October 2026. This is a reading summary, not the submission decision note or a chosen product direction.

## Current user request

Initialize a private repository under the personal GitHub account `james-entwisle`, preserve the supplied files, and prepare a Next.js frontend with an Elixir/Ash backend. Further product instructions will follow.

The attached documents describe the interview assignment. They are source material, not authorization to send a submission, contact anyone, launch a pilot or operate real accounts.

## What the assignment asks for

Choose one consumer problem and segment, decide whether it deserves investment, and demonstrate the smallest useful intervention. Challenging the premise or proposing a diagnostic is allowed.

The stated delivery capacity is two engineers, shared design and compliance, and four weeks to launch a limited pilot. The candidate timebox is three hours including reading. The invitation, which was not supplied, contains the submission deadline and destination.

Deliverables:

- A working demonstration using synthetic data, with a normal case and two meaningful exceptions or failure cases.
- Clear separation between working behaviour, simulation and future work, plus local run instructions.
- A decision note of up to two pages covering the problem, evidence, key falsifying assumption, consumer and business value, calculations, scope, strongest alternative, pilot and decision criteria.
- An explanation of decisions AI can make independently and a brief description of tool contributions.

The discussion includes a live change or new constraint. Building ability, product judgement and entrepreneurial judgement carry equal weight. Consumer safety and honest interpretation of evidence are minimum expectations.

## Product context and evidence

Composer drafts collections email and SMS, with a separate model checking drafts. It operates in Canada, Australia and the UAE on a fixed contact schedule. It is not live in the US. The US uses templates. The exercise asks whether responding to engagement could help consumers pay or make sustainable plans.

Only that Composer background reflects the real product. All supporting-pack observations, economics, systems, example copy, limits and data are fictional exercise inputs. The policy rules are not US law.

Consumers can view their account, pay, choose an approved plan or request help. Plans require explicit consumer confirmation. An incomplete plan is not an agreement. Partial plans cannot currently be saved and resumed, and links open the account landing page after authentication.

Eight interviews with consumers who left a plan flow found date mismatch in three, interruption in two, creditor or balance questions in two, and concern about committing before checking household expenses in one. Of 50 support conversations after portal visits, 12 concerned dates, nine account or balance questions, seven resuming plans and 22 other topics. These small observations suggest several problems; they do not establish population rates.

The event stream records starts, not reasons for leaving. Approved terms can be displayed, but changing creditor-approved terms is outside the four-week scope. Support operates weekday business hours and cannot promise immediate replies outside them.

## Historical data

The CSV contains five mutually exclusive cohorts from one 30-day intake of 100,000 unique consumers. At t0 each has a positive balance, no pending payment or active plan and an allowed contact route within scope. Cohorts reflect the deepest signal in the preceding 24 hours and remain fixed after t0. All consumers stayed on the existing contact schedule; none received the proposed intervention.

| Cohort | Consumers | Paid by 30 days | Confirmed plan by 30 days | Paid or plan by 30 days | Cash per consumer |
| --- | ---: | ---: | ---: | ---: | ---: |
| No observed engagement | 60,000 | 7% | 4% | 8.33% | $10.50 |
| Tracked open only | 22,000 | 10% | 7% | 12.45% | $15.00 |
| Tracked click only | 10,000 | 18% | 10% | 21% | $30.60 |
| Portal visit without plan start | 6,000 | 30% | 15% | 34.17% | $54.00 |
| Plan started but incomplete | 2,000 | 50% | 30% | 57.5% | $95.00 |

`Paid or plan = paid_30d + plan_confirmed_30d - paid_and_plan_30d`. Cash per consumer divides settled cash by all consumers in that cohort. These are descriptive baselines, not causal uplift estimates. A plan generates no fee until money settles, and a payment need not repay the full balance.

The pack permits assuming an equivalent new, eligible, non-overlapping intake every 30 days for sizing. Actual US scale, intervention lift, long-term completion and support demand are unknown.

## Economics to use later

All amounts are USD. InDebted retains 15% of settled cash and pays variable payment costs of 2%, leaving 13% before other incremental costs. Email costs $0.003 per send, SMS $0.035, Composer $0.012 per draft/review attempt including rejections, and incremental support $6 per conversation. The full allocation costs $50,000: 40 engineer-days at $1,000 plus $10,000 for shared design and compliance. Smaller work may cost less.

A later recommendation should estimate incremental contribution as `0.13 × incremental settled cash - incremental communication costs - model attempts × 0.012 - incremental support conversations × 6`. Compare that with the chosen build cost and label reach, lift and persistence assumptions. Account for any replaced scheduled sends when estimating incremental costs. Do not assign revenue directly to plan creation.

## Constraints for any later demonstration

- Outreach requires current `pilot_scope_allowed=true`, English, positive balance, no pending payment or active plan, and no hold. Unknown required state blocks contact. Do not infer eligibility from state names or IP addresses.
- Channel permission must currently be true. Engagement cannot grant permission. Holds include disputes, cease-contact, representation, bankruptcy, identity uncertainty, hardship review and unresolved complaints.
- Reminders may be sent Monday to Friday, 09:00 inclusive to 18:00 exclusive, in a verified local timezone and within any narrower preference. Unknown timezone blocks sending.
- All non-transactional outbound attempts share one rolling limit across channels and workflows: one per 24 hours and three per seven days. Attempts exactly on either boundary still count. Provider handoff counts even if delivery fails. Transactional receipts and requested service replies sit outside this budget.
- Existing scheduled activity occurs on days 0, 3, 7, 14 and 21 at 10:00 local, subject to rules. Payment pending or settled, confirmed plans and holds pause it. Engagement alone does not. Any triggered workflow must coordinate queued contacts and shared limits.
- Keep a labelled fixed, versioned disclosure and opt-out block. Do not invent its legal wording. Use authoritative facts and approved options. Keep debt details out of subject lines and unverified previews. Do not invent amounts, terms, urgency, consequences or commitments.
- AI cannot determine legal eligibility, change terms, enrol someone or debit funds. A second-model pass is not legal approval. A consumer must confirm their plan.
- Real pilot release requires explicit human compliance approval of new messaging, AI behaviour or material journey changes, an audit record and a named owner who can stop sends.

## System and scenario semantics

The account service is authoritative, though fields can be unknown. Payment initiations and opt-outs appear there immediately. Matching events can lag by 15 minutes. Re-read source state before a send; earlier event snapshots may be stale. Payment outcome reporting arrives the next day.

Events have occurrence and ingestion timestamps and may be late, duplicated or out of order. Contact APIs can enqueue, cancel and reschedule. A provider handoff cannot reliably be recalled. Saving partial plans, triggered workflows and a purpose-built stop control require new work. Composer is sandbox-only for the US, with no production permission, approved prompt set or evaluation; any model output in the demonstration must be mocked.

The JSON holds 12 independent scenarios, not a representative sample. Only events ingested by the decision time are visible. Later source patches take effect at their effective timestamps, while their notifications become visible at ingestion. A replay must not know future patches in advance.

| Scenarios | Illustrative case |
| --- | --- |
| S01-S04 | Open, click, portal visit, incomplete plan start |
| S05 | Later opt-out with delayed event |
| S06 | Later pending payment with delayed event |
| S07 | Shared contact budget already exhausted |
| S08 | Unknown timezone |
| S09 | Outside pilot scope |
| S10 | Hardship review hold |
| S11 | Duplicate event delivery |
| S12 | Late engagement event after plan becomes active |

## Decisions still open

The segment, consumer problem, intervention, strongest alternative, experiment, value assumptions, persistence choice and implementation scope remain unchosen. The current repo only initializes the requested stack.

A later decision note should distinguish clicks or starts from additional settled cash and sustainable plans, and set expansion, change, pause and stop criteria. Name the specialist questions that matter to the chosen proposal, including permissions, applicable jurisdictions, disclosures, disputes, client restrictions, data retention and vulnerable consumers. External legal research and deployment are not required by the assignment.
