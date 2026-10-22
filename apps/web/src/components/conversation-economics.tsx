"use client";

import { useState } from "react";
import { money, number, type Economics } from "@/lib/api";
import { defaults, calculateConversation, type Inputs } from "./conversation-economics-calculation";
import styles from "./conversation-economics.module.css";

const fields: { key: keyof Inputs; label: string; max: number; step: number; help: string }[] = [
  { key: "smsReach", label: "SMS-reachable share, %", max: 100, step: 1, help: "Eligible consumers who can receive the intervention" },
  { key: "response", label: "Reply rate among reachable, %", max: 100, step: 1, help: "A separate, unmeasured delivery assumption" },
  { key: "lift", label: "Added paid conversion among responders, pp", max: 100, step: 0.5, help: "Illustrative absolute difference, not an estimated effect" },
  { key: "turns", label: "AI turns per responder", max: 100, step: 1, help: "Include retries and review in the assumed turn count" },
  { key: "turnCost", label: "Hypothetical cost per AI turn, $", max: 10, step: 0.001, help: "Editable placeholder, not the supplied Composer price" },
  { key: "sends", label: "Net extra SMS sends per responder", max: 100, step: 0.5, help: "After any verified scheduled-send replacement savings" },
  { key: "escalations", label: "Extra support conversations per 100 responders", max: 100, step: 0.5, help: "Costed at the exercise assumption of $6 each" },
  { key: "savings", label: "Avoided support conversations per 100 responders", max: 100, step: 0.5, help: "Defaults to zero; credit only measured reductions" },
];

export function ConversationEconomics({ data }: { data: Economics }) {
  const [inputs, setInputs] = useState(defaults);
  const result = calculateConversation(data, inputs);
  const low = calculateConversation(data, inputs, 1);
  const high = calculateConversation(data, inputs, 5);
  return (
    <section className={styles.panel} aria-labelledby="conversation-economics-title">
      <div className={styles.heading}>
        <div><span className={styles.eyebrow}>Proposed conversational delivery</span><h2 id="conversation-economics-title">What changes when consumers reply?</h2></div>
        <span className={styles.badge}>Separate sensitivity</span>
      </div>
      <p className={styles.intro}>The model above remains unchanged. This extension uses its calculated audience, cohort mix, payer-cash multiplier and investment. SMS reach and reply rate are additional assumptions.</p>
      <div className={styles.summary}>
        <div><span>Annual contribution at +1 to +5 pp among responders</span><strong>{money(low.annual)} to {money(high.annual)}</strong><small>Before build. Scenario range, not a forecast or confidence interval.</small></div>
        <div><span>Selected +{number(inputs.lift)} pp scenario</span><strong>{result.payback === null ? "No payback" : `${number(result.payback)} monthly intakes`}</strong><small>Simple payback after launch, excluding build time and ramp.</small></div>
      </div>
      <details className={styles.inputs}>
        <summary>Edit conversational assumptions</summary>
        <div className={styles.grid}>
          {fields.map((field) => <label key={field.key}>{field.label}<input type="number" min="0" max={field.max} step={field.step} value={inputs[field.key]} onChange={(event) => {
            const value = Math.min(field.max, Math.max(0, Number(event.target.value)));
            setInputs((current) => ({ ...current, [field.key]: value }));
          }} /><small>{field.help}</small></label>)}
        </div>
      </details>
      <div className={styles.bridge} aria-label="Conversational audience and cash calculation">
        <div><span>Engaged audience</span><strong>{number(data.assumptions.population)}</strong></div>
        <span aria-hidden="true">→</span><div><span>SMS reachable</span><strong>{number(result.reachable)}</strong></div>
        <span aria-hidden="true">→</span><div><span>Responders</span><strong>{number(result.responders)}</strong></div>
        <span aria-hidden="true">→</span><div><span>Extra payers</span><strong>{number(result.payers)}</strong></div>
        <span aria-hidden="true">→</span><div><span>Extra settled cash</span><strong>{money(result.cash)}</strong></div>
      </div>
      <dl className={styles.ledger}>
        <div><dt>Retained fees, 15%</dt><dd>{money(result.fees)}</dd></div>
        <div><dt>Payment costs, 2%</dt><dd>−{money(result.payment)}</dd></div>
        <div><dt>Net extra SMS</dt><dd>−{money(result.sms)}</dd></div>
        <div><dt>Hypothetical AI turns</dt><dd>−{money(result.ai)}</dd></div>
        <div><dt>Extra support</dt><dd>−{money(result.support)}</dd></div>
        <div><dt>Assumed support savings</dt><dd>+{money(result.supportSavings)}</dd></div>
        <div className={styles.total}><dt>Contribution per monthly intake</dt><dd>{money(result.contribution)}</dd></div>
      </dl>
      <p className={styles.note}>All costs and effects above are incremental. The supplied $0.012 Composer draft/review attempt is not a validated two-way conversation cost. This extension does not add the earlier model&apos;s costs again. Costs incurred for non-responders or other operating work must be estimated separately.</p>
      <p className={styles.note}>Responders are self-selected. This bridge is planning arithmetic, not a causal estimate. Evaluate 30-day settled cash per randomised consumer, including non-responders and suppressed accounts. The original 18,000-consumer baseline collected $820,000; the full-reach +3 pp example gives about $148,000 annual contribution before new costs, as a sensitivity only.</p>
    </section>
  );
}
