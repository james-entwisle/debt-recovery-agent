# Case study supporting pack

> **All figures, observations, example copy, system details and policy limits in this pack are invented for the exercise. Only the Composer background in the brief reflects the current product. The rules are exercise assumptions, not US law, and carry no legal approval.**

The tables in this pack hold everything you need for a recommendation. The CSV and JSON are optional inputs for building; you do not need to process every record.

## Current consumer journey

A consumer can review their account, make a one-off payment, choose from the payment plans approved for their account or ask for help. A plan requires the consumer to choose terms and explicitly confirm them. An abandoned plan is not an agreement. Plans cannot be saved and resumed today, and existing links open the account landing page after authentication.

## Current contact schedule

This example schedule starts once the required initial notice process is complete. Every consumer in the historical dataset followed it unless their status or preferences suppressed a message.

*Example*

| Journey day | Channel | Purpose                              |
| ----------- | ------- | ------------------------------------ |
| 0           | Email   | Review account and available options |
| 3           | SMS     | Reminder with account link           |
| 7           | Email   | Explain payment and help options     |
| 14          | SMS     | Reminder with account link           |
| 21          | Email   | Review options or request help       |

Messages are scheduled for 10 am local time, then subject to the pilot rules below. The schedule skips unavailable channels. A pending or settled payment, a confirmed plan or an account hold pauses the schedule; engagement alone does not. Transactional receipts and requested service replies sit outside the schedule and do not count towards the contact budget.

## Example current copy

These are body excerpts. The sending service adds a versioned disclosure and opt-out block. In your demonstration, show that block as a fixed, labelled component and do not invent its legal wording.

Email subject: Your account options  
Body: You can review your account with [creditor] and the available payment options in your secure portal. If you have a question or need help, you can contact our team. [View account]

SMS body: Debt Recovery: You can review your account and available options here: [secure account link]. [Fixed disclosure and opt-out block]

## Consumer observations

We interviewed eight consumers who left the portal without completing a plan.

*Synthetic*

| Observation       | What was reported                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| 3 of 8 interviews | Wanted the first payment to fall after their next payday; the available dates did not fit.     |
| 2 of 8 interviews | Were interrupted and expected to return to their unfinished plan.                              |
| 2 of 8 interviews | Wanted to understand who the creditor was or why the balance differed from what they expected. |
| 1 of 8 interviews | Was concerned about committing to a recurring payment before reviewing household expenses.     |

### Consumer comments

“I was checking what my options were. I had not decided I could pay that week.”

“I got interrupted halfway through. When I came back, I had to start again.”

### Operational observations

- Of 50 support conversations after portal visits, 12 were about plan dates, 9 about account or balance questions, 7 about resuming a plan and 22 about other topics. Each conversation was tagged with one main topic.
- The event stream records that a plan flow started, but not why someone left it.
- The portal can show the plan options already approved for an account and route a help request. Changing creditor-approved terms needs a separate agreement and is out of scope for the four-week pilot.
- Support works weekday business hours. Help requests can be logged at other times, but we cannot promise an immediate human response.

### What is unknown

We have no causal evidence that a follow-up improves outcomes, no US experiment on Composer, no reliable measure of why most consumers leave and no pilot results. State your assumptions and propose how to resolve them.

## Historical cohort data

File: `03_historical_cohorts.csv`. Each row is a mutually exclusive cohort from a 30-day intake of 100,000 unique consumers, each with one account. Each consumer enters once, at a decision time called t0. At t0, all have a positive balance, no pending payment or active plan, and an allowed contact route within pilot scope.

A consumer's cohort is the deepest signal observed in the 24 hours before t0, in this order: plan started, authenticated portal visit, tracked click, tracked open, no observed engagement. A consumer who clicked and then started a plan appears only in the plan-started cohort. Plans in that cohort are still incomplete at t0. Later activity never changes the cohort.

*Synthetic*

| Signal at t0                    | Consumers | Paid by 7d | Paid by 30d | Plans by 30d | Paid and plan by 30d |
| ------------------------------- | --------- | ---------- | ----------- | ------------ | -------------------- |
| No observed engagement          | 60,000    | 1,800      | 4,200       | 2,400        | 1,600                |
| Tracked open only               | 22,000    | 1,100      | 2,200       | 1,540        | 1,000                |
| Tracked click only              | 10,000    | 1,000      | 1,800       | 1,000        | 700                  |
| Portal visit without plan start | 6,000     | 1,200      | 1,800       | 900          | 650                  |
| Plan started but incomplete     | 2,000     | 700        | 1,000       | 600          | 450                  |

*Synthetic*

| Signal at t0                    | Cash by 30d USD | Opted out by 30d | Complained by 30d |
| ------------------------------- | --------------- | ---------------- | ----------------- |
| No observed engagement          | 630,000         | 360              | 36                |
| Tracked open only               | 330,000         | 176              | 22                |
| Tracked click only              | 306,000         | 100              | 12                |
| Portal visit without plan start | 324,000         | 72               | 12                |
| Plan started but incomplete     | 190,000         | 30               | 6                 |

All consumers stayed on the existing schedule and none received any new intervention. Every record has a complete 30-day window, with outcomes measured after t0 regardless of later contact eligibility.

“Paid” means at least one settled payment, not necessarily full repayment. Cash is settled cash net of reversals within the window, summed across the row. Plans are confirmed plans, even if no instalment has settled yet. A consumer can both pay and confirm a plan; “Paid and plan by 30d” counts those consumers.

Opt-outs count unique consumers who opted out of at least one electronic channel. Complaints count unique consumers with at least one logged complaint, and not every complaint is a confirmed compliance breach. Both use all cohort consumers as the denominator and can overlap with payment or plan outcomes.

For opportunity sizing, assume the same number of new, eligible, non-overlapping consumers arrives every 30 days. The pack does not supply actual US scale or long-term payment behaviour.

## Economics and available systems

All amounts are USD. The economics support a first decision, not a full forecast, so use ranges and state your assumptions about lift, recurring costs, eligible reach and persistence beyond the observed window.

*Exercise assumptions*

| Input                    | Exercise assumption                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retained collections fee | 15% of settled cash. The other 85% belongs to clients.                                                                                                     |
| Variable payment cost    | 2% of settled cash, paid by the operator.                                                                                                                      |
| Communication cost       | Email $0.003 per send; SMS $0.035 per send.                                                                                                                |
| Composer cost            | $0.012 extra per draft and review attempt, including rejected attempts.                                                                                    |
| Support cost             | $6 extra per conversation the intervention creates.                                                                                                        |
| Pilot capacity and cost  | 40 engineer-days at $1,000 each, plus $10,000 shared across design and compliance. The full four-week allocation costs $50,000; smaller work can use less. |

Plans earn no fee when created; fees arise when cash settles. Fixed overhead is excluded. The pack has no estimate of extra support demand, future instalment completion or long-term retention.

### What you can use

- Account service: balance, approved plan options, creditor display name, language, payment and plan status, jurisdiction scope, timezone, channel permissions and account holds. These fields are authoritative, but values can be unknown.
- Event stream: message opens and clicks, authenticated portal visits, plan starts and confirmations, payment initiation and settlement, preference changes and help requests. Each event has an occurrence and an ingestion timestamp. Events can arrive late, twice or out of order.
- Contact service: current and queued contacts, contact history across channels, approved templates and disclosure blocks. APIs can enqueue, cancel and reschedule. Once a message reaches the provider, it cannot reliably be recalled.
- Composer: draft generation and a separate model check run in a sandbox. There is no US production permission, approved US prompt set or evaluation result. Mock any model output you need.
- Portal and analytics: you can change a small portal interaction, link through existing authentication, assign experiments by consumer and log events. Saving partial plans, a new event-triggered workflow and a purpose-built stop control would all need building.

You can re-read eligibility fields from the source services. Payment initiations and opt-outs show there immediately, but their event notifications can lag by up to 15 minutes. Payment outcome reporting arrives the next day. Account fields inside an earlier event are snapshots and may be out of date.

## Rules for the pilot

Treat these rules as fixed. They simplify on purpose and sometimes narrow what would otherwise be permitted. You can narrow the pilot further, but treat any relaxation as a future dependency.

- Scope: contact only records with `pilot_scope_allowed=true` and `language=en`. The flag stands in for compliance's decision on which jurisdictions and accounts the pilot can cover. Do not infer it from a state name or IP address. Unknown or false means no pilot outreach.
- Eligibility: no pilot outreach while a payment is pending, a plan is active, the balance is zero or the account has a hold. Holds include a dispute, cease-contact request, attorney representation, bankruptcy, identity uncertainty, hardship review or unresolved complaint. If a required status is unknown, do not contact.
- Channel: use a channel only if its current `email_allowed` or `sms_allowed` field is true. An open, click or portal visit does not grant or restore permission. Respect channel-specific opt-outs and any broader contact restriction.
- Timing: send pilot reminders Monday to Friday, from 9 am (inclusive) to 6 pm (exclusive) in the consumer's verified local timezone. Respect any narrower known preference. If the timezone is unknown, do not send, and do not guess it from a device or IP address.
- Contact budget: all non-transactional outbound attempts share one limit, whether scheduled or triggered and on any channel: one in any rolling 24 hours and three in any rolling seven days. An attempt made exactly 24 hours or seven days earlier still counts. Attempts handed to a provider count even if delivery fails. These limits are pilot policy, not legal limits.
- Content: keep the versioned, fixed disclosure and opt-out component. Use authoritative account facts and existing approved options. Do not invent amounts, deadlines, discounts, threats, legal consequences, credit effects or commitments. Keep debt details out of subject lines and other unverified preview surfaces.
- Consumer choice: a model cannot create or change payment terms, enrol a consumer, debit funds or decide legal eligibility. The consumer must confirm any plan. A second-model pass does not override a rule or constitute legal approval.
- Release: any new message approach, AI behaviour or material journey change needs explicit approval from a human compliance reviewer before a real pilot. Log the inputs, decision, content or template version, model versions where relevant, and send result, so an incident can be investigated. A named owner must be able to stop new pilot sends.

### Where specialist input is still needed

Name the few open questions that matter most to your proposal. A real launch would need confirmation of federal, state and local applicability, channel permissions, notices and disclosures, dispute handling, client restrictions, data use and retention, and treatment of vulnerable consumers.

For context, federal rules cover communication restrictions and electronic opt-outs [1], harassment including cumulative contact [2], and false or misleading representations [3]. The numeric limits above are exercise policy. Do not apply the federal telephone-call presumptions to email or SMS.

## Files and data definitions

### Historical cohort CSV

`03_historical_cohorts.csv` holds the two tables above as five rows keyed by `cohort_id`, with no missing values. `paid_and_plan_30d` counts consumers in both `paid_30d` and `plan_confirmed_30d`, and every row is marked `synthetic=true`. Other columns follow the definitions under Historical cohort data.

### Scenario JSON

`04_consumer_scenarios.json` has 12 independent situations. They are not a sample of the historical cohort, so do not use them to estimate rates. Use any records you find useful or create your own. There is no required output schema and no hidden preferred implementation. Scenario timings are illustrative and do not follow the example schedule.

- Each record has `scenario_id`, `consumer_id`, `decision_time_utc`, `state_at_decision`, `contact_history`, `queued_contacts` and `incoming_events`. The state is what the source services show at the decision time.
- Times ending in Z are UTC. `timezone` is an IANA timezone for computing local time. A null required field means unknown, not permission. Money is in USD and each consumer has one account.
- `state_at_decision` includes `balance_usd`, `pilot_scope_allowed`, `language`, `timezone`, `email_allowed`, `sms_allowed`, `payment_status` (none, pending or settled), `plan_status` (none, started or active), `holds` (a list of hold codes such as `hardship_review`) and `contact_window_override`. A null override means the default pilot window; every supplied override is null.
- `contact_history` lists non-transactional attempts in the previous seven days, with `attempt_id`, `channel` and `attempted_at_utc`. `queued_contacts` are planned but not yet attempted, with `contact_id`, `channel`, `scheduled_at_utc` and `template_id`. Both lists are complete.
- Events have `event_id`, `type`, `occurred_at_utc` and `ingested_at_utc`. `type` is one of `email_open`, `message_click`, `portal_visit`, `plan_started`, `payment_initiated` or `all_electronic_opt_out`. A repeated `event_id` is a duplicate delivery. Events can arrive after the state has changed, and only events ingested by the decision time are visible at that time.
- `subsequent_updates` holds later state changes for replay. Each entry has an `effective_at_utc`, a `state_patch` and the matching `event`. The patch takes effect in the source service at `effective_at_utc`; the event becomes visible at its `ingested_at_utc`. The decision-maker does not know about these updates in advance.

### Optional background sources

Background on some of the risks. They do not validate the pilot rules. Checked 21 October 2026.

[[1] CFPB Regulation F section 1006.6 Communications](https://www.consumerfinance.gov/rules-policy/regulations/1006/6/)

[[2] CFPB Regulation F section 1006.14 Harassment](https://www.consumerfinance.gov/rules-policy/regulations/1006/14/)

[[3] CFPB Regulation F section 1006.18 Misleading representations](https://www.consumerfinance.gov/rules-policy/regulations/1006/18/)
