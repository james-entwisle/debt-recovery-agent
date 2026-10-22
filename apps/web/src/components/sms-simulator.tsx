"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowRight, Check, ChevronDown, Clock3, LockKeyhole, MessageCircle, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { dateTime, humanise, money, type Command, type Scenario, type SessionView } from "@/lib/api";
import type { Act } from "./resolution-app";

const examples = [
  { label: "Payday", text: "I get paid every second Friday." },
  { label: "$50 fortnightly", text: "Can I pay $50 every fortnight?" },
  { label: "Continue a plan", text: "I started setting up a plan yesterday but got interrupted." },
  { label: "Account question", text: "Who is this creditor?" },
  { label: "Dispute", text: "I don't recognise this debt." },
  { label: "Hardship", text: "I'm struggling with money at the moment." },
  { label: "Already paid", text: "I've already paid." },
  { label: "STOP", text: "STOP" },
];

const sourceChanges = [
  { id: "pending", label: "Payment becomes pending", patch: { payment_status: "pending" } },
  { id: "settled", label: "Payment settles", patch: { payment_status: "settled" } },
  { id: "plan", label: "Plan becomes active", patch: { plan_status: "active" } },
  { id: "optout", label: "Consumer opts out of SMS", patch: { sms_allowed: false } },
  { id: "hardship", label: "Human applies hardship hold", patch: { holds: ["hardship"] } },
  { id: "dispute", label: "Account service applies dispute hold", patch: { holds: ["dispute"] } },
  { id: "scope", label: "Account leaves pilot scope", patch: { pilot_scope_allowed: false } },
  { id: "window", label: "Narrow contact window to 09:00–10:00", patch: { contact_window_override: { start_hour: 9, end_hour: 10, weekdays: [1, 2, 3, 4, 5] } } },
] satisfies { id: string; label: string; patch: Extract<Command, { type: "patch_account" }>["patch"] }[];

function fact(value: boolean | null) {
  return value === null ? "Unknown" : value ? "Allowed" : "Denied";
}

export function SmsSimulator({ view, act, busy, scenarios, open, onOpenJit }: {
  view: SessionView;
  act: Act;
  busy: boolean;
  scenarios: Scenario[];
  open: (scenarioId: string) => Promise<void>;
  onOpenJit: (actionId: string) => void;
}) {
  const [text, setText] = useState("");
  const [sourceChange, setSourceChange] = useState("pending");
  const thread = useRef<HTMLDivElement>(null);
  const { conversation, account, decision } = view;
  const agent = conversation.decision;
  const queued = view.contacts.find((contact) => contact.status === "queued");
  const lastAction = conversation.jit_actions.findLast((action) => action.status !== "completed");
  const completedActions = new Set(conversation.jit_actions.filter((action) => action.status === "completed").map((action) => action.id));
  const original = queued ? view.original_contacts.find((contact) => contact.contact_id === queued.contact_id) : view.original_contacts[0];
  const checks = decision.eligibility;
  const knownPreferences = [
    view.preferences.frequency && humanise(view.preferences.frequency),
    view.preferences.payday && `Payday ${view.preferences.payday}`,
    view.preferences.max_instalment_usd && `Up to ${money(view.preferences.max_instalment_usd)}`,
    conversation.declared_timing,
  ].filter(Boolean);

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [conversation.messages.length, busy]);

  async function send(message: string) {
    if (!message.trim() || busy) return;
    if (await act({ type: "receive_sms", text: message.trim() })) setText("");
  }

  function advance(minutes: number) {
    return act({ type: "advance", to_utc: new Date(new Date(view.now_utc).getTime() + minutes * 60000).toISOString() });
  }

  return (
    <div className="sms-experience">
      <header className="sms-heading">
        <div><p className="eyebrow">ADAPTIVE RESOLUTION</p><h1>The conversation is the next step.</h1><p>A consumer reply, a current account check, and a useful way forward.</p></div>
        <span className="simulation-label"><span /> Deterministic simulation</span>
      </header>
      <div className="sms-workspace">
        <aside className="sms-inspector" aria-label="Consumer and scenario controls">
          <div className="inspector-title"><h2>Consumer context</h2><span className="demo-pill">Operator view</span></div>
          <label className="field-label" htmlFor="sms-scenario">Supplied scenario</label>
          <select id="sms-scenario" className="sms-select" value={view.scenario_id} disabled={busy} onChange={(event) => void open(event.target.value)}>
            {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.id} · {scenario.label}</option>)}
          </select>
          <div className="consumer-reference"><span>{view.consumer_id}</span><Button size="sm" variant="ghost" isDisabled={busy} onPress={() => void open(view.scenario_id)}><RotateCcw size={13} /> Reset</Button></div>
          <dl className="sms-facts">
            <div><dt>Balance</dt><dd>{account.balance_usd === null ? "Unknown" : money(account.balance_usd)}</dd></div>
            <div><dt>Payment</dt><dd>{humanise(account.payment_status ?? "unknown")}</dd></div>
            <div><dt>Plan</dt><dd>{humanise(account.plan_status ?? "unknown")}</dd></div>
            <div><dt>Pilot scope</dt><dd>{fact(account.pilot_scope_allowed)}</dd></div>
            <div><dt>SMS / email</dt><dd>{fact(account.sms_allowed)} / {fact(account.email_allowed)}</dd></div>
            <div><dt>Account holds</dt><dd>{account.holds?.map(humanise).join(", ") || "None"}</dd></div>
            <div><dt>Timezone</dt><dd>{account.timezone ?? "Unverified"}</dd></div>
            <div><dt>Session</dt><dd>{humanise(conversation.status)}</dd></div>
            <div><dt>Latest intent</dt><dd>{conversation.last_intent ? humanise(conversation.last_intent) : "None yet"}</dd></div>
            <div><dt>Queued contact</dt><dd>{queued ? `${humanise(queued.channel)} · ${dateTime(queued.scheduled_at_utc, account.timezone)}` : "None"}</dd></div>
          </dl>
          <details className="sms-control-details" open>
            <summary>Simulate source changes <ChevronDown size={14} /></summary>
            <p>Explicit account-service updates. The assistant cannot apply a formal hold.</p>
            <label className="sr-only" htmlFor="source-change">Authoritative update</label>
            <select id="source-change" className="sms-select" value={sourceChange} onChange={(event) => setSourceChange(event.target.value)} disabled={busy}>
              {sourceChanges.map((change) => <option key={change.id} value={change.id}>{change.label}</option>)}
            </select>
            <Button variant="outline" size="sm" isDisabled={busy} onPress={() => {
              const change = sourceChanges.find((item) => item.id === sourceChange);
              if (change) void act({ type: "patch_account", patch: change.patch }, "Source account updated and policy rechecked.");
            }}>Apply source update</Button>
          </details>
          <details className="sms-control-details">
            <summary>Clock and contact policy <ChevronDown size={14} /></summary>
            <p>{dateTime(view.now_utc, account.timezone)}</p>
            <div className="sms-clock-buttons"><Button size="sm" variant="secondary" isDisabled={busy} onPress={() => void advance(15)}><Clock3 size={13} /> +15 min</Button><Button size="sm" variant="secondary" isDisabled={busy} onPress={() => void advance(60)}>+1 hour</Button></div>
            <div className="sms-clock-buttons"><Button size="sm" variant="outline" isDisabled={busy || !decision.proposal} onPress={() => void act({ type: "schedule" })}>Queue proposal</Button><Button size="sm" variant="outline" isDisabled={busy || !queued} onPress={() => queued && void act({ type: "handoff", contact_id: queued.contact_id })}>Try handoff</Button></div>
            <Button size="sm" variant="outline" isDisabled={busy} onPress={() => void act({ type: "exhaust_contact_budget" }, "Synthetic cross-channel contact attempt added. Rolling policy rechecked.")}>Exhaust contact budget</Button>
            <Button size="sm" variant="ghost" isDisabled={busy} onPress={() => void act({ type: "set_stop", stopped: !view.stopped })}>{view.stopped ? "Resume pilot" : "Stop pilot"}</Button>
            <p>Rolling cross-channel limits: 1 in 24 hours and 3 in 7 days. Weekdays, 09:00–18:00 local time.</p>
          </details>
          <p className="sms-context-note">S05 and S06 demonstrate delayed opt-out and payment events. Advance 15 minutes to inspect the fresh source state.</p>
        </aside>

        <section className="sms-conversation-column" aria-label="SMS conversation simulator">
          <div className="phone-frame">
            <div className="phone-status"><span>SMS preview</span><span>Simulated · no messages sent</span></div>
            <div className="phone-contact"><span className="assistant-avatar"><MessageCircle size={22} /></span><div><strong>Debt Recovery Agent</strong><span>Here to help with your next step</span></div><ShieldCheck size={19} /></div>
            <div className="sms-thread" ref={thread} aria-live="polite" aria-label="Conversation history">
              <div className="thread-date">{dateTime(view.now_utc, account.timezone)}</div>
              {conversation.messages.map((message) => (
                <article className={`sms-message ${message.direction} ${message.status} ${message.kind}`} key={message.id}>
                  <span className="sms-message-kind">{message.direction === "inbound" ? "Consumer" : humanise(message.kind)}</span>
                  <div className="sms-bubble"><p>{message.text}</p>
                    {message.jit_action_id && !completedActions.has(message.jit_action_id) && <button className="sms-jit-link" disabled={busy} onClick={() => message.jit_action_id && onOpenJit(message.jit_action_id)}><LockKeyhole size={14} /><span>Open secure next step</span><ArrowRight size={15} /></button>}
                  </div>
                  <div className="sms-message-meta"><span>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: account.timezone ?? "UTC" }).format(new Date(message.at_utc))}</span><span>{humanise(message.status)}</span>{message.status.includes("approved") && <Check size={11} />}</div>
                </article>
              ))}
              {busy && <div className="sms-typing"><Spinner size="sm" /> Checking context and policy…</div>}
            </div>
            <div className="sms-disclosure"><LockKeyhole size={12} /><span>Demo disclosure placeholder. Reply STOP to opt out. No account detail is shown before verification.</span></div>
            <form className="sms-composer" onSubmit={(event) => { event.preventDefault(); void send(text); }}>
              <label className="sr-only" htmlFor="consumer-reply">Consumer reply</label>
              <input id="consumer-reply" autoComplete="off" maxLength={1000} placeholder="Type a consumer reply…" value={text} onChange={(event) => setText(event.target.value)} disabled={busy} />
              <Button type="submit" aria-label="Send consumer reply" isDisabled={busy || !text.trim()}><Send size={18} /></Button>
            </form>
          </div>
          <div className="sms-examples"><span>Try a consumer reply</span><div>{examples.map((example) => <button key={example.label} disabled={busy} onClick={() => void send(example.text)}>{example.label}</button>)}</div><p>Separate synthetic SMS examples. These are proposed capabilities, not supplied conversation histories.</p></div>
        </section>

        <aside className="sms-agent" aria-label="Agent decisions and next action">
          <div className="inspector-title"><h2>Behind the reply</h2><span className="agent-live-dot" /></div>
          <p className="agent-intent-label">Detected intent</p><h3 className="agent-intent">{conversation.last_intent ? humanise(conversation.last_intent) : "Waiting for a reply"}</h3>
          <div className="agent-context"><span className="tiny-label">REMEMBERED CONTEXT</span><p>{knownPreferences.length ? knownPreferences.join(" · ") : "No preferences stated yet."}</p></div>
          <div className="agent-checks"><span className="tiny-label">CURRENT ACCOUNT CHECKS</span>
            {[{ label: "Source eligibility", pass: checks.source_eligible }, { label: "SMS permission", pass: account.sms_allowed === true }, { label: "No payment in progress", pass: account.payment_status === "none" }, { label: "No formal account holds", pass: account.holds?.length === 0 }].map((check) => <div key={check.label}><span>{check.label}</span><span className={check.pass ? "check-pass" : "check-blocked"}>{check.pass ? <Check size={14} /> : "Blocked"}</span></div>)}
          </div>
          <div className="agent-next"><span className="tiny-label">CHOSEN NEXT ACTION</span><strong>{agent ? humanise(agent.chosen_action) : "Listen to the consumer"}</strong><p>{agent?.allowed_actions.length ? `Permitted: ${agent.allowed_actions.map(humanise).join(", ")}.` : "A reply will pass through intent detection and the policy layer."}</p>
            {agent?.escalation_required && <span className="escalation-note">Human assistance requested</span>}
            {lastAction && <Button variant="primary" size="sm" isDisabled={busy} onPress={() => onOpenJit(lastAction.id)}>Open {humanise(lastAction.state)} <ArrowRight size={14} /></Button>}
          </div>
          {agent && <div className="agent-reasons"><span className="tiny-label">WHY THIS RESPONSE</span>{agent.reasons.map((reason) => <p key={reason}>{humanise(reason)}</p>)}<span className="agent-template">{agent.template_id ?? "No response template"} · {humanise(agent.classification)}</span></div>}
          <div className="agent-contact"><span className="tiny-label">FUTURE PROACTIVE CONTACT</span><strong>{humanise(decision.outcome)}</strong>{original && <p>Original: {dateTime(original.scheduled_at_utc, account.timezone)}.</p>}{decision.proposal && <p>Proposed: {dateTime(decision.proposal.scheduled_at_utc, account.timezone)}.</p>}<p>{queued ? `${humanise(queued.channel)} queued for ${dateTime(queued.scheduled_at_utc, account.timezone)}.` : "No contact remains queued."}</p><p>{checks.attempts_24h}/1 in 24h · {checks.attempts_7d}/3 in 7d</p></div>
          <details className="sms-audit"><summary>Decision and audit trace <ChevronDown size={14} /></summary><p className="small muted">Requested service replies are a separate classification. They do not grant permission for future outreach.</p>{decision.reason_codes.map((reason) => <code key={reason}>{reason}</code>)}<ol>{view.audit.slice(-12).reverse().map((entry) => <li key={entry.sequence}><span>{humanise(entry.event)}</span><small>{dateTime(entry.at_utc, account.timezone)}</small></li>)}</ol></details>
        </aside>
      </div>
    </div>
  );
}
