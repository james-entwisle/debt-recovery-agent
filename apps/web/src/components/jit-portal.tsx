"use client";

import { useEffect, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown, CreditCard, FileCheck2, HeartHandshake, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { api, date, dateTime, humanise, jitStateSchema, money, type Command, type JitState, type PlanOption, type SessionView } from "@/lib/api";
import type { Act } from "./resolution-app";

const tasks = [
  { value: "account", label: "Account overview / verification", heading: "Your account, clearly explained.", description: "Check the account information you need before deciding what to do next." },
  { value: "options", label: "View repayment options", heading: "Find an option that works for you.", description: "These arrangements have fixed, creditor-approved example terms. There is no commitment to explore them." },
  { value: "payday", label: "Payday-aware plan matching", heading: "Start with your pay cycle.", description: "Tell us your preferences. We will check them against the arrangements already available." },
  { value: "draft", label: "Draft plan setup", heading: "Take it one step at a time.", description: "Save a selection and return to it later. A draft is not a payment agreement." },
  { value: "resume", label: "Resume saved draft", heading: "Pick up where you left off.", description: "We will check your saved selection against the account and approved terms again." },
  { value: "review", label: "Review and confirm plan", heading: "Review every payment before confirming.", description: "An agreement is only created after you choose an approved arrangement and explicitly confirm it." },
  { value: "payment", label: "Make one-off payment", heading: "Choose a one-off amount.", description: "This demonstration records a pending payment. No payment provider is connected and no money moves." },
  { value: "clarification", label: "Account / balance clarification", heading: "Get clarity before taking a step.", description: "You can review the account information or ask a person to help with a question." },
  { value: "help", label: "Request assistance", heading: "Let's find the right support.", description: "You do not need to choose a payment arrangement to ask for help." },
  { value: "pending", label: "Payment pending / confirmation", heading: "Check the latest account status.", description: "We check the current account before offering any further payment action." },
] satisfies { value: JitState; label: string; heading: string; description: string }[];

type Verification =
  | { kind: "unverified" }
  | { kind: "link"; sessionId: string; actionId: string; token: string; expiresAt: string }
  | { kind: "verified"; sessionId: string; actionId: string; view: SessionView };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Please try again.";
}

export function JitPortal({ view, actionId, busy, act, onView, onAction, onLeave }: {
  view: SessionView;
  actionId: string | null;
  busy: boolean;
  act: Act;
  onView: (view: SessionView) => void;
  onAction: (actionId: string) => void;
  onLeave?: () => void;
}) {
  const [verification, setVerification] = useState<Verification>({ kind: "unverified" });
  const [working, setWorking] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const action = view.conversation.jit_actions.find((candidate) => candidate.id === actionId);
  const state = action?.state ?? "account";
  const task = tasks.find((candidate) => candidate.value === state) ?? tasks[0];
  const authenticated = verification.kind === "verified" && verification.sessionId === view.session_id && verification.actionId === actionId ? verification.view : null;
  const link = verification.kind === "link" && verification.sessionId === view.session_id && verification.actionId === actionId ? verification : null;
  const loading = busy || working;

  useEffect(() => {
    if (verification.kind !== "verified" || verification.sessionId !== view.session_id || verification.actionId !== actionId || verification.view.revision >= view.revision) return;
    let active = true;
    api.jitView(view.session_id, verification.actionId).then((next) => {
      if (active) setVerification({ ...verification, view: next });
    }).catch((failure: unknown) => {
      if (active) {
        setVerification({ kind: "unverified" });
        setError(errorMessage(failure));
      }
    });
    return () => { active = false; };
  }, [view.revision, view.session_id, actionId, verification]);

  async function createTask(nextState: JitState) {
    setWorking(true); setError(""); setNotice("");
    try {
      const next = await api.command(view.session_id, { type: "create_jit", state: nextState });
      const created = next.conversation.jit_actions.at(-1);
      if (!created) throw new Error("No task was created. Please retry.");
      onView(next); onAction(created.id);
      setVerification({ kind: "unverified" }); setIdentityChecked(false);
      return created.id;
    } catch (failure) { setError(errorMessage(failure)); return null; }
    finally { setWorking(false); }
  }

  async function getLink() {
    setWorking(true); setError("");
    try {
      let id = actionId;
      if (!id) {
        const next = await api.command(view.session_id, { type: "create_jit", state });
        const created = next.conversation.jit_actions.at(-1);
        if (!created) throw new Error("No task was created. Please retry.");
        id = created.id; onView(next); onAction(id);
      }
      const issued = await api.jitLink(view.session_id, id);
      setVerification({ kind: "link", sessionId: view.session_id, actionId: id, token: issued.token, expiresAt: issued.expires_at_utc });
      setIdentityChecked(false);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setWorking(false); }
  }

  async function verify() {
    if (!link || !identityChecked) return;
    setWorking(true); setError("");
    try {
      const next = await api.jitVerify(link.sessionId, link.actionId, link.token);
      setVerification({ kind: "verified", sessionId: link.sessionId, actionId: link.actionId, view: next });
      onView(next); setNotice("Demo verification complete. This task now has a scoped, expiring session.");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setWorking(false); }
  }

  async function scopedAct(command: Command, success?: string) {
    if (!authenticated || !actionId) return false;
    setWorking(true); setError(""); setNotice("");
    try {
      const next = await api.jitCommand(view.session_id, actionId, command);
      setVerification({ kind: "verified", sessionId: view.session_id, actionId, view: next });
      onView(next);
      if (command.type === "resume_draft" && next.conversation.draft?.status !== "resumed") {
        setError(`This draft cannot be resumed. ${humanise(next.conversation.draft?.invalid_reason ?? "The account, terms or expiry changed")}. Start a new selection or ask for assistance.`);
        return false;
      }
      if (success) setNotice(success);
      return true;
    } catch (failure) { setError(errorMessage(failure)); return false; }
    finally { setWorking(false); }
  }

  function leave() {
    setVerification({ kind: "unverified" }); setIdentityChecked(false);
    setNotice("You have left this task. Any saved draft remains unconfirmed.");
    onLeave?.();
  }

  return <div className="jit-experience">
    <header className="jit-demo-heading"><div><p className="eyebrow">JUST-IN-TIME PORTAL</p><h1>The right task, when it is needed.</h1><p>Focused interfaces opened from the conversation, with fresh account checks.</p></div><div className="jit-state-control"><label htmlFor="jit-state">Explore a JIT state</label><select id="jit-state" value={state} disabled={loading} onChange={(event) => {
      const parsed = jitStateSchema.safeParse(event.target.value);
      if (parsed.success) void createTask(parsed.data);
    }}>{tasks.map((candidate) => <option key={candidate.value} value={candidate.value}>{candidate.label}</option>)}</select></div></header>
    {error && <div className="alert error" role="alert">{error}</div>}
    {notice && <div className="jit-notice" role="status"><CheckCircle2 size={16} />{notice}</div>}
    {!authenticated ? <section className="jit-verification" aria-label="Simulated secure verification">
      <div className="jit-verification-visual"><span className="jit-lock"><LockKeyhole size={34} /></span><span className="tiny-label">A SECURE NEXT STEP</span><h2>Continue with confidence.</h2><p>This link opens one task. Account details stay hidden until the demo verification step is complete.</p><div className="verification-properties"><span><Check size={14} /> Single-use link</span><span><Check size={14} /> Short expiry</span><span><Check size={14} /> Account and task scope</span></div></div>
      <div className="jit-verification-form"><span className="demo-pill">Proposed capability · simulated</span><h2>{task.label}</h2><p>No real SMS or identity check is sent. The server validates an opaque token and exchanges it for an HTTP-only scoped demo cookie.</p>
        {!link ? <><Button className="full-action" isDisabled={loading} onPress={() => void getLink()}>{loading ? <Spinner size="sm" /> : <LockKeyhole size={16} />} Create demo secure link</Button><p className="small muted">An SMS link alone does not establish identity. Production verification and US content approval would need validation.</p></> : <><div className="jit-link-ready"><ShieldCheck size={19} /><div><strong>Demo link ready</strong><span>Expires {dateTime(link.expiresAt)}</span></div></div><a className="jit-generated-link" href={`#demo-secure-task=${encodeURIComponent(link.actionId)}&token=${encodeURIComponent(link.token)}`} onClick={(event) => { event.preventDefault(); setNotice("Generated demo link opened. Complete the simulated identity check before opening account details."); }}>Open generated demo secure link <ArrowRight size={12} /></a><label className="jit-consent"><input type="checkbox" checked={identityChecked} onChange={(event) => setIdentityChecked(event.target.checked)} disabled={loading} /><span>Simulate a completed identity check for this synthetic consumer. This is a demonstration, not real identity proof.</span></label><Button className="full-action" isDisabled={loading || !identityChecked} onPress={() => void verify()}>{loading ? <Spinner size="sm" /> : <ShieldCheck size={16} />} Verify and open this task</Button><Button size="sm" variant="ghost" isDisabled={loading} onPress={() => void getLink()}>Create a fresh link</Button></>}
      </div>
    </section> : <div className="jit-authenticated">
      <div className="jit-verified-bar"><span><ShieldCheck size={15} /> Demo verification complete · {humanise(state)} task</span><Button variant="ghost" size="sm" onPress={leave}><LogOut size={14} /> Leave task</Button></div>
      <div className="jit-task-layout"><aside className="jit-account-context"><span className="tiny-label">VERIFIED SYNTHETIC ACCOUNT</span><strong>{authenticated.portal.creditor_display_name.replace(/\s*\(synthetic\)\s*/i, "")}</strong><span className="jit-account-ref">{authenticated.consumer_id}</span><dl><div><dt>Outstanding balance</dt><dd>{authenticated.account.balance_usd === null ? "Unavailable" : money(authenticated.account.balance_usd)}</dd></div><div><dt>Payment status</dt><dd>{humanise(authenticated.account.payment_status ?? "unknown")}</dd></div><div><dt>Plan status</dt><dd>{humanise(authenticated.account.plan_status ?? "unknown")}</dd></div></dl><p>No debit or payment provider is connected. All terms are fixed synthetic examples.</p></aside>
        <section className="jit-task-body" aria-busy={loading}><p className="eyebrow">{task.label.toUpperCase()}</p><h2>{task.heading}</h2><p className="jit-task-intro">{task.description}</p><JitTask key={`${authenticated.session_id}-${actionId}`} state={state} view={authenticated} act={scopedAct} busy={loading} onTask={(nextState) => void createTask(nextState)} onLeave={leave} /></section>
      </div>
    </div>}
    <details className="jit-operator-tests"><summary>Demo session and expiry controls <ChevronDown size={14} /></summary><p>Local operator controls to test server validation. Link expiry and session expiry use the real server clock, separately from the scenario timeline.</p><div><Button size="sm" variant="outline" isDisabled={loading} onPress={() => void act({ type: "expire_jit_links" }, "Issued links expired. Verification will now reject them.")}>Expire issued links</Button><Button size="sm" variant="outline" isDisabled={loading} onPress={() => void act({ type: "expire_jit_session" }, "Scoped demo sessions expired.")}>Expire scoped sessions</Button><Button size="sm" variant="outline" isDisabled={loading || !actionId} onPress={async () => {
      if (!actionId) return;
      setWorking(true);
      try { const next = await api.jitView(view.session_id, actionId); setVerification({ kind: "verified", sessionId: view.session_id, actionId, view: next }); setNotice("Server accepted the current scoped session."); }
      catch (failure) { setVerification({ kind: "unverified" }); setError(errorMessage(failure)); }
      finally { setWorking(false); }
    }}>Check scoped session</Button><Button size="sm" variant="ghost" isDisabled={loading || !view.conversation.draft} onPress={() => void act({ type: "expire_draft" }, "Draft expired. Resume will revalidate and reject it.")}>Expire saved draft</Button></div></details>
    <p className="jit-footer-note">Proposed demo capability. Drafts and conversations live in API memory for a bounded session and are lost on restart or idle expiry.</p>
  </div>;
}

function JitTask({ state, view, act, busy, onTask, onLeave }: { state: JitState; view: SessionView; act: Act; busy: boolean; onTask: (state: JitState) => void; onLeave: () => void }) {
  const [selected, setSelected] = useState<string | null>(view.conversation.draft?.status && ["saved", "resumed"].includes(view.conversation.draft.status) ? view.conversation.draft.option_id : null);
  const [reviewing, setReviewing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [frequency, setFrequency] = useState(view.preferences.frequency ?? "any");
  const [payday, setPayday] = useState(view.preferences.payday ?? "");
  const [amount, setAmount] = useState(view.preferences.max_instalment_usd?.toString() ?? "");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [validation, setValidation] = useState("");
  const [saved, setSaved] = useState(false);
  const [resumed, setResumed] = useState(false);
  const option = view.portal.options.find((candidate) => candidate.id === selected);
  const matching = view.portal.options.filter((candidate) => candidate.matches);
  const draft = view.conversation.draft;
  const latestHelp = view.support_requests.at(-1);
  const isPlanTask = ["options", "payday", "draft", "review", "resume"].includes(state);

  async function match() {
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) { setValidation("Enter an amount above $0, or leave this blank."); return; }
    if (payday && payday < view.now_utc.slice(0, 10)) { setValidation("Choose today or later in the simulated account timeline."); return; }
    const preferences = { frequency, ...(payday ? { payday } : {}), ...(amount ? { max_instalment_usd: Number(amount) } : {}) };
    if (await act({ type: "match_preferences", preferences })) { setValidation(""); setReviewing(false); setSelected(null); setConsent(false); setSaved(false); }
  }

  if (view.confirmed_plan && isPlanTask) return <div className="jit-complete"><CheckCircle2 size={34} /><h3>Your example plan is confirmed.</h3><p>{view.confirmed_plan.instalments} payments of {money(view.confirmed_plan.instalment_usd)}, {humanise(view.confirmed_plan.frequency).toLowerCase()}. No debit has been made.</p><Schedule option={view.confirmed_plan} /><Button variant="outline" onPress={onLeave}>Return to the conversation <ArrowRight size={15} /></Button></div>;

  if ((view.account.payment_status === "pending" || view.account.payment_status === "settled") && state !== "help" && state !== "clarification") return <div className="jit-status-panel"><span className="jit-status-icon"><CreditCard size={28} /></span><h3>{view.account.payment_status === "pending" ? "Your payment is being processed." : "The account shows a settled payment."}</h3><p>{view.payment ? `${money(view.payment.amount_usd)} recorded as a simulated payment. ` : ""}Further payment prompts are suppressed while the current state is checked.</p><Button variant="outline" onPress={onLeave}>Return to the conversation <ArrowRight size={15} /></Button></div>;

  if (state === "account" || state === "clarification") return <div className="jit-clarification"><dl><div><dt>Creditor</dt><dd>{view.portal.creditor_display_name}</dd></div><div><dt>Account reference</dt><dd>{view.consumer_id}</dd></div><div><dt>Outstanding balance</dt><dd>{view.account.balance_usd === null ? "Unavailable" : money(view.account.balance_usd)}</dd></div><div><dt>As checked</dt><dd>{dateTime(view.now_utc, view.account.timezone)}</dd></div></dl><p>These synthetic details do not establish the validity of a debt. If something looks wrong, ask a person to review it before choosing a payment action.</p><Button variant="primary" isDisabled={busy} onPress={() => void act({ type: "request_help" }, "Your account question has been sent to the simulated support queue.")}><HeartHandshake size={16} /> Ask for an account review</Button>{latestHelp && <p className="jit-inline-success"><CheckCircle2 size={16} />Support request {latestHelp.id} is {humanise(latestHelp.status).toLowerCase()}.</p>}{state === "account" && <button className="jit-text-link" onClick={() => onTask("options")}>Explore approved arrangements <ArrowRight size={14} /></button>}</div>;

  if (state === "help") return <div className="jit-help"><div className="jit-help-callout"><HeartHandshake size={27} /><div><h3>There is room to ask for help.</h3><p>Questions, financial difficulty or a concern about the account can be reviewed by a person. The assistant does not decide dispute outcomes or apply a formal hold.</p></div></div><Button isDisabled={busy} onPress={() => void act({ type: "request_help" }, "A simulated assistance request is queued for a person to review.")}>Request assistance <ArrowRight size={15} /></Button>{latestHelp && <div className="jit-inline-success"><CheckCircle2 size={17} /><span>Request {latestHelp.id}: {humanise(latestHelp.status)}. No plan was created.</span></div>}<p className="small muted">Any formal hardship or dispute hold is applied through the explicit account-service controls in the simulator.</p></div>;

  if (state === "payment") return <form className="jit-payment" onSubmit={(event) => { event.preventDefault();
    const value = Number(paymentAmount);
    if (!Number.isFinite(value) || value <= 0 || value > (view.account.balance_usd ?? 0)) { setValidation("Enter an amount above $0 and no more than the current balance."); return; }
    if (!consent) { setValidation("Confirm the simulation before continuing."); return; }
    void act({ type: "simulate_payment", amount_usd: value, confirmed: true }, "Simulated payment recorded as pending. No money moved.");
  }}><label className="field-label" htmlFor="oneoff-amount">Amount in USD</label><div className="jit-amount-input"><span>$</span><input id="oneoff-amount" inputMode="decimal" type="number" min="0.01" step="0.01" max={view.account.balance_usd ?? 0} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0.00" disabled={busy || !view.portal.can_confirm} /></div><label className="jit-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I understand this records a synthetic pending payment. No card is charged and no funds move.</span></label>{validation && <p role="alert" className="field-error">{validation}</p>}{!view.portal.can_confirm && <p className="field-error">The current account cannot take this payment action. Please ask for assistance.</p>}<Button type="submit" isDisabled={busy || !consent || !view.portal.can_confirm}><CreditCard size={16} /> Simulate payment</Button></form>;

  if (state === "pending") return <div className="jit-status-panel"><ShieldCheck size={30} /><h3>No payment is currently pending.</h3><p>This view always loads the authoritative account status. Use the payment control in the simulator or a simulated one-off payment to demonstrate pending-payment suppression.</p><Button variant="outline" onPress={onLeave}>Return to the conversation</Button></div>;

  if (state === "resume" && !resumed) return <div className="jit-resume">{draft ? <><div className="jit-draft-summary"><FileCheck2 size={25} /><div><strong>{humanise(draft.status)} draft</strong><span>Saved {dateTime(draft.saved_at_utc)} · expires {dateTime(draft.expires_at_utc)}</span></div></div><p>We will recheck the account, expiry and the exact creditor-approved terms before restoring this selection. Nothing has been confirmed.</p><Button isDisabled={busy || !["saved", "resumed"].includes(draft.status)} onPress={async () => { if (await act({ type: "resume_draft" }, "Saved draft revalidated. Review the approved selection before confirming.")) { setResumed(true); setSelected(draft.option_id); setReviewing(true); } }}>Revalidate and resume <ArrowRight size={15} /></Button>{!["saved", "resumed"].includes(draft.status) && <Button variant="outline" onPress={() => onTask("options")}>Start a new selection</Button>}</> : <><h3>There is no saved selection yet.</h3><p>A past plan-start event does not contain form data. Choose a new arrangement, save it as a draft, then return here.</p><Button onPress={() => onTask("draft")}>Start a draft <ArrowRight size={15} /></Button></>}</div>;

  if (saved && draft) return <div className="jit-complete"><FileCheck2 size={32} /><h3>Your selection is saved.</h3><p>It is unconfirmed and creates no payment obligation. You can return through a new secure link before {dateTime(draft.expires_at_utc)}.</p><Button onPress={onLeave}>Leave and return later <ArrowRight size={15} /></Button><button className="jit-text-link" onClick={() => { setSaved(false); setReviewing(true); }}>Continue reviewing now</button><p className="small muted">This proposed draft feature uses bounded server memory. It is lost when the demo server restarts or the session expires.</p></div>;

  if (reviewing && option) return <div className="jit-review"><button className="jit-text-link" onClick={() => { setReviewing(false); setConsent(false); }}><ArrowLeft size={14} /> Back to approved options</button><div className="jit-review-total"><span>{option.label}</span><strong>{option.instalments} × {money(option.instalment_usd)}</strong><p>{humanise(option.frequency)} · total {money(option.total_usd)}</p></div><Schedule option={option} /><label className="jit-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} /><span>I have reviewed this complete example schedule and choose to confirm this plan. No debit is authorised by this demonstration.</span></label><div className="jit-task-actions"><Button isDisabled={busy || !consent || !option.matches || !view.portal.can_confirm} onPress={() => void act({ type: "confirm_plan", option_id: option.id, confirmed: true, review_token: view.portal.review_token }, "Example plan confirmed. The conversation and future-contact policy have been updated.")}>Confirm example plan <Check size={15} /></Button><Button variant="outline" isDisabled={busy || !option.matches || !view.portal.can_confirm} onPress={async () => { if (await act({ type: "save_draft", option_id: option.id })) setSaved(true); }}>Save and finish later</Button></div>{!view.portal.can_confirm && <p className="field-error">The account changed. This plan cannot be confirmed now.</p>}</div>;

  return <div className="jit-options">{(state === "payday" || view.preferences.frequency || view.preferences.payday || view.preferences.max_instalment_usd) && <div className="jit-preference-note"><CalendarDays size={19} /><p>{[view.preferences.frequency && humanise(view.preferences.frequency), view.preferences.payday && `Payday ${date(view.preferences.payday)}`, view.preferences.max_instalment_usd && `Up to ${money(view.preferences.max_instalment_usd)} each payment`].filter(Boolean).join(" · ") || "Share a preference to check the approved arrangements."}</p></div>}
    <details className="jit-preference-form" open={state === "payday"}><summary>Match your payment preferences <ChevronDown size={14} /></summary><div className="jit-preference-fields"><label>Pay cycle<select value={frequency} onChange={(event) => setFrequency(event.target.value)} disabled={busy}><option value="any">Any frequency</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></label><label>Next payday<input type="date" min={view.now_utc.slice(0, 10)} value={payday} onChange={(event) => setPayday(event.target.value)} disabled={busy} /></label><label>Preferred maximum, USD<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Optional" disabled={busy} /></label></div>{validation && <p className="field-error" role="alert">{validation}</p>}<Button size="sm" variant="outline" isDisabled={busy} onPress={() => void match()}>Check approved options</Button><p className="small muted">Matching checks your stated preferences. It does not assess affordability or create new terms.</p></details>
    {!view.portal.can_confirm ? <div className="jit-status-panel"><ShieldCheck size={27} /><h3>This account needs a different next step.</h3><p>A current hold, arrangement, payment or eligibility restriction prevents confirmation. You can ask for help.</p><Button variant="outline" onPress={() => onTask("help")}>Request assistance</Button></div> : matching.length ? <><div className="jit-options-label"><span>{matching.length} approved {matching.length === 1 ? "option" : "options"} {view.preferences.frequency || view.preferences.payday || view.preferences.max_instalment_usd ? "match your preferences" : "available"}</span><span>USD</span></div>{matching.map((candidate) => <button key={candidate.id} className={`jit-plan-option ${selected === candidate.id ? "selected" : ""}`} disabled={busy} onClick={() => { setSelected(candidate.id); setConsent(false); }} aria-pressed={selected === candidate.id}><span className="jit-plan-radio">{selected === candidate.id && <span />}</span><span><strong>{money(candidate.instalment_usd)} <small>{humanise(candidate.frequency).toLowerCase()}</small></strong><span>{candidate.instalments} payments · starts {date(candidate.first_payment_date)}</span></span><span className="jit-plan-total">{money(candidate.total_usd)}<small>Total</small></span></button>)}<div className="jit-task-actions"><Button isDisabled={busy || !option?.matches} onPress={() => setReviewing(true)}>Review selected plan <ArrowRight size={15} /></Button>{state === "draft" && <Button variant="outline" isDisabled={busy || !option?.matches} onPress={async () => { if (option && await act({ type: "save_draft", option_id: option.id })) setSaved(true); }}>Save draft</Button>}</div></> : <div className="jit-no-match"><h3>No approved arrangement fits those preferences.</h3><p>We cannot invent a new amount, date or payment frequency. You can adjust your preferences or ask a person about your situation.</p><Button variant="outline" onPress={() => onTask("help")}>Ask for assistance <HeartHandshake size={15} /></Button></div>}
  </div>;
}

function Schedule({ option }: { option: Pick<PlanOption, "payment_schedule" | "first_payment_date" | "last_payment_date" | "total_usd"> }) {
  return <details className="jit-schedule"><summary><CalendarDays size={15} /><span>Full payment schedule</span><ChevronDown size={14} /></summary><ol>{option.payment_schedule.map((payment, index) => <li key={`${payment.date}-${index}`}><span>{date(payment.date)}</span><strong>{money(payment.amount_usd)}</strong></li>)}</ol><div><span>Total</span><strong>{money(option.total_usd)}</strong></div></details>;
}
