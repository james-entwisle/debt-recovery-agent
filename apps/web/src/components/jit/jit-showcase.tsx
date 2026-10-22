"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ArrowRight, Check, CreditCard, LockKeyhole } from "lucide-react";
import { date, humanise, money, type PlanOption, type SessionView } from "@/lib/api";
import { ActionHeader, ActionResult, ScheduleSummary } from "./action-parts";

const tasks = [
  { id: "plan", label: "Set up a plan" },
  { id: "resume", label: "Finish plan setup" },
  { id: "date", label: "Change payment date" },
  { id: "frequency", label: "Change frequency" },
  { id: "payoff", label: "Pay the balance" },
] as const;
export type PreviewTask = typeof tasks[number]["id"];

const example: PlanOption = {
  id: "preview-weekly", label: "Weekly", frequency: "weekly",
  first_payment_date: "2026-11-06", last_payment_date: "2026-12-25",
  payment_schedule: Array.from({ length: 8 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 10, 6 + i * 7)).toISOString().slice(0, 10), amount_usd: 80,
  })),
  instalment_usd: 80, instalments: 8, total_usd: 640, matches: true, reason_codes: [],
};

export function JitShowcase({ view, initialTask, onLeave }: {
  view: SessionView; initialTask: string | null; onLeave: () => void;
}) {
  const [selected, setSelected] = useState<PreviewTask>(() => tasks.find((item) => item.id === initialTask)?.id ?? "plan");
  const options = view.portal.options.length ? view.portal.options : [example];
  return <div className="jit-showcase">
    <nav className="jit-showcase-tabs" aria-label="Preview task">
      {tasks.map((task) => <button key={task.id} type="button" aria-current={selected === task.id ? "page" : undefined} onClick={() => setSelected(task.id)}>{task.label}</button>)}
    </nav>
    <section className="jit-showcase-stage">
      <div className="jit-action-panel" aria-label={tasks.find((item) => item.id === selected)?.label}>
        <div className="jit-showcase-account"><LockKeyhole size={14} /><span>{view.portal.creditor_display_name.replace(/\s*\(synthetic\)/gi, "")}</span><span>•• 004</span></div>
        <PreviewScreen key={selected} task={selected} view={view} options={options} onLeave={onLeave} />
      </div>
    </section>
    <p className="jit-showcase-disclaimer">Interactive preview. Choices stay in this demo; no account changes or money movement.</p>
  </div>;
}

function PreviewScreen({ task, view, options, onLeave }: { task: PreviewTask; view: SessionView; options: PlanOption[]; onLeave: () => void }) {
  const [optionId, setOptionId] = useState(view.conversation.draft?.option_id ?? options[0]?.id ?? example.id);
  const option = options.find((item) => item.id === optionId) ?? options[0] ?? example;
  const methods = view.portal.payment_methods.filter((item) => item.eligible);
  const [method, setMethod] = useState(methods[0]?.label ?? "Demo Visa ending 4242");
  const currentDate = view.confirmed_plan?.first_payment_date ?? option.first_payment_date;
  const [requestedDate, setRequestedDate] = useState(() => {
    const next = new Date(currentDate + "T12:00:00Z"); next.setUTCDate(next.getUTCDate() + 3); return next.toISOString().slice(0, 10);
  });
  const currentFrequency = view.confirmed_plan?.frequency ?? "monthly";
  const [frequency, setFrequency] = useState(currentFrequency === "fortnightly" ? "weekly" : "fortnightly");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isPlan = task === "plan" || task === "resume";
  const balance = view.account.balance_usd ?? option.total_usd;
  const titles = { plan: "Review your payment plan", resume: "Finish setting up your plan", date: "Change your payment date", frequency: "Change payment frequency", payoff: "Pay off your balance" };
  if (submitted) return <ActionResult
    title={task === "payoff" ? "Payment pending" : isPlan ? "Plan preview complete" : "Change requested"}
    description={task === "payoff" ? `${money(balance)} is processing in this simulation. Your existing schedule stays in place.` : isPlan ? "Your choices are recorded in this preview. No payment has been taken." : "Awaiting approval. Your current plan stays in place."}
    pending={!isPlan} onDone={onLeave}
  />;
  return <>
    <ActionHeader title={titles[task]} description={task === "resume" ? "Your plan and card are saved. Review and confirm to finish." : task === "date" || task === "frequency" ? "Choose your preference. Our team will review the change." : undefined} />
    {isPlan ? <>
      <div className="jit-form-fields"><label>Payment plan<select value={optionId} onChange={(e) => setOptionId(e.target.value)}>{options.map((item) => <option key={item.id} value={item.id}>{money(item.instalment_usd)} {item.frequency} · {item.instalments} payments</option>)}</select></label></div>
      <ScheduleSummary option={option} />
    </> : task === "payoff" ? <div className="jit-payment-balance"><span>Outstanding balance</span><strong>{money(balance)}</strong><small>Full balance · simulated payment</small></div> : <>
      <dl className="jit-key-values"><div><dt>{task === "date" ? "Current payment date" : "Current frequency"}</dt><dd>{task === "date" ? date(currentDate) : humanise(currentFrequency)}</dd></div></dl>
      <div className="jit-form-fields">{task === "date" ? <label>Preferred payment date<input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} /></label> : <label>Preferred frequency<select value={frequency} onChange={(e) => setFrequency(e.target.value)}>{["weekly", "fortnightly", "monthly"].filter((item) => item !== currentFrequency).map((item) => <option key={item} value={item}>{humanise(item)}</option>)}</select></label>}</div>
      <p className="jit-important-note">Your current schedule continues until the change is approved.</p>
    </>}
    {(isPlan || task === "payoff") && <>
      <div className="jit-form-fields"><label><span className="jit-showcase-method-label"><CreditCard size={16} /> Payment method</span><select value={method} onChange={(e) => setMethod(e.target.value)}>{methods.length ? methods.map((item) => <option key={item.id} value={item.label}>{item.label}</option>) : <option>Demo Visa ending 4242</option>}</select></label></div>
      <label className="jit-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{isPlan ? "I’ve reviewed the schedule and want to confirm this plan." : `I choose to make a simulated payment of ${money(balance)}.`}</span></label>
    </>}
    <div className="jit-action-footer">
      <Button className="full-action" isDisabled={((isPlan || task === "payoff") && !consent) || (task === "date" && (!requestedDate || requestedDate === currentDate))} onPress={() => setSubmitted(true)}>{isPlan ? "Confirm plan preview" : task === "payoff" ? `Pay ${money(balance)} in demo` : "Send change request"}<Check size={16} /></Button>
      <Button variant="ghost" size="sm" onPress={onLeave}>Back to conversation <ArrowRight size={15} /></Button>
    </div>
  </>;
}
