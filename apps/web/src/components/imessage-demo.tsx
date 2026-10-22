"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, RotateCcw } from "lucide-react";
import { humanise, money, type JitState, type SessionView } from "@/lib/api";
import type { LibraryTaskId } from "./jit/action-config";
import type { Act } from "./resolution-app";
import { JitMessagePreview } from "./jit-message-preview";
import "./conversation-phone.css";

type Line = { from: "agent" | "user"; text: string };
type Choice = {
  reply: string;
  after: Line[];
  jit?: JitState;
  task?: LibraryTaskId;
  next?: Choice[];
};
type Moment = {
  label: string;
  when: string;
  trigger: string;
  bubbles: Line[];
  jit?: JitState;
  task?: LibraryTaskId;
  choices: Choice[];
};

function momentsFor(creditor: string, amount: string): Moment[] {
  return [
    {
      label: "Opening",
      when: "Today",
      trigger: "Account still open",
      bubbles: [
        { from: "agent", text: `Hi, this is Debt Recovery. You have an account with ${creditor}. The outstanding balance is ${amount}.` },
        { from: "agent", text: "You can set up a payment plan if you want to. There are a few options, and you choose when you want to start. Nothing is charged until you confirm. Reply if you want that, or if you just need to know what this is." },
      ],
      choices: [
        {
          reply: "Can I set up a payment plan?",
          after: [{ from: "agent", text: "Yes. This page shows the amounts and when the payments would start. Nothing happens until you confirm there." }],
          jit: "options",
          task: "plan",
        },
        {
          reply: "What is this account?",
          after: [{ from: "agent", text: `It's an account with ${creditor}. The outstanding balance is ${amount}. Nothing is agreed, and nothing has been charged. Do you want to look at a plan, or the amount to pay it off?` }],
          next: [
            {
              reply: "A plan I can start later",
              after: [{ from: "agent", text: "This is the plan page. You choose the start date. It isn't a plan until you confirm." }],
              jit: "options",
              task: "plan",
            },
            {
              reply: "The amount to pay it off",
              after: [{ from: "agent", text: `The outstanding balance is ${amount}. Check it on the page before you agree to anything. It isn't settled until a payment clears.` }],
              jit: "early_payoff",
              task: "payoff",
            },
          ],
        },
      ],
    },
    {
      label: "No reply",
      when: "3 days later",
      trigger: "No reply",
      bubbles: [
        { from: "agent", text: `We texted a few days ago about the ${creditor} account and haven't heard back. The outstanding balance is still ${amount}.` },
        { from: "agent", text: "Reply if you want to ask about more time to pay it off, or if you'd like any more information. You don't have to reply. Reply STOP if you'd rather not get these texts." },
      ],
      choices: [
        {
          reply: "I need more time to pay",
          after: [{ from: "agent", text: `You can spread ${amount} out, and you choose when the first payment would start. I won't send a page unless you want it. Do you want to see those options?` }],
          next: [
            {
              reply: "Yes, show me the options",
              after: [{ from: "agent", text: "Here they are. Nothing starts until you confirm." }],
              jit: "options",
              task: "plan",
            },
            {
              reply: "Not yet",
              after: [{ from: "agent", text: `That's fine. The balance stays ${amount}. Reply when you want to look at it, or STOP if you'd rather not get these texts.` }],
            },
          ],
        },
        {
          reply: "Can I get more information?",
          after: [{ from: "agent", text: `The account is with ${creditor}. The outstanding balance is ${amount}. Nothing is agreed and nothing has been charged. I can send the amount to clear it, or leave this here.` }],
          next: [
            {
              reply: "Send the amount to clear it",
              after: [{ from: "agent", text: "This is the payoff page. Check the figure before you agree to anything. Nothing is taken until you confirm." }],
              jit: "early_payoff",
              task: "payoff",
            },
            {
              reply: "Leave it for now",
              after: [{ from: "agent", text: "Understood. You don't need to do anything. Reply if you want more information later, or STOP if you'd rather not get these texts." }],
            },
          ],
        },
      ],
    },
    {
      label: "Plan not finished",
      when: "Next day",
      trigger: "Plan started, not finished",
      bubbles: [
        { from: "agent", text: `You started a payment plan on the ${creditor} account and didn't finish it. I've kept where you got to. Nothing has been charged.` },
        { from: "agent", text: `The balance is still ${amount}. This link is only for that unfinished plan. You can check it and finish, or leave it.` },
      ],
      jit: "resume",
      task: "resume",
      choices: [
        {
          reply: "I'll finish it",
          after: [{ from: "agent", text: "Check the amount and the start date on that page. It isn't a plan until you confirm." }],
        },
        {
          reply: "Leave it",
          after: [{ from: "agent", text: "It stays unfinished. Nothing has been charged. Reply if you want to pick it up later." }],
        },
      ],
    },
    {
      label: "Payment coming up",
      when: "Before the next payment",
      trigger: "Monthly payment coming up",
      bubbles: [
        { from: "agent", text: `Your plan on the ${creditor} account is monthly. The next payment is the one already agreed.` },
        { from: "agent", text: "Reply if that's too much at once and you want to ask about fortnightly. Otherwise it stays as it is. I can't change it from this text." },
      ],
      choices: [
        {
          reply: "Fortnightly would be easier",
          after: [{ from: "agent", text: "This page is only for that request. The current payments stay as they are until someone approves the change." }],
          jit: "change_frequency",
          task: "frequency",
        },
        {
          reply: "Monthly is fine",
          after: [{ from: "agent", text: "Then it stays as agreed. Nothing changes from this text." }],
        },
      ],
    },
    {
      label: "Missed payment",
      when: "After the due date",
      trigger: "Plan payment missed",
      bubbles: [
        { from: "agent", text: `A payment on your ${creditor} plan was due and didn't come in. Nothing else has been taken. The rest of the plan is still in place, and the outstanding balance is ${amount}.` },
        { from: "agent", text: "Reply if you want to move the date, if the card was the problem, or if you just need to know where the account stands. I won't change anything from this text." },
      ],
      choices: [
        {
          reply: "Can I move the date?",
          after: [{ from: "agent", text: "This page is only a request to move the date. The payments you already have stay as they are until someone approves the change." }],
          jit: "change_date",
          task: "date",
        },
        {
          reply: "The card was the problem",
          after: [{ from: "agent", text: "Nothing was taken on that attempt. This page is only for a different card. The plan dates stay as they are." }],
          jit: "payment",
          task: "method",
        },
        {
          reply: "Where does the account stand?",
          after: [{ from: "agent", text: `The missed payment wasn't taken, so the balance is still ${amount}. The other payments stay as agreed. Do you want to move the date, or leave the plan as it is?` }],
          next: [
            {
              reply: "Move the date",
              after: [{ from: "agent", text: "This page is only that request. Nothing moves until it's approved." }],
              jit: "change_date",
              task: "date",
            },
            {
              reply: "Leave the plan as it is",
              after: [{ from: "agent", text: "Then it stays as agreed. Reply if you want to move the date later. Nothing else will be taken from this text." }],
            },
          ],
        },
      ],
    },
    {
      label: "Clear the balance",
      when: "Balance still open",
      trigger: "Option to pay it off",
      bubbles: [
        { from: "agent", text: `The ${creditor} balance is still open. The outstanding amount is ${amount}.` },
        { from: "agent", text: "Reply if you want that figure sent so you can check it. Nothing is taken unless you confirm a payment, and it isn't settled until it clears." },
      ],
      choices: [
        {
          reply: "Send me the amount",
          after: [{ from: "agent", text: "This is the payoff page, not a plan. Check the figure before you agree to anything." }],
          jit: "early_payoff",
          task: "payoff",
        },
        {
          reply: "Not now",
          after: [{ from: "agent", text: "Understood. Nothing has been taken. Reply if you want the amount later." }],
        },
      ],
    },
    {
      label: "Card declined",
      when: "Payment attempted",
      trigger: "Card declined",
      bubbles: [
        { from: "agent", text: `The card on the ${creditor} account was declined. Nothing was taken. The outstanding balance is still ${amount}.` },
        { from: "agent", text: "Another payment can't be attempted on that card. Reply if you want to use a different one. This text doesn't charge anything." },
      ],
      choices: [
        {
          reply: "I'll use a different card",
          after: [{ from: "agent", text: "This page is only for the card. The plan itself stays as it is." }],
          jit: "payment",
          task: "method",
        },
        {
          reply: "What happened?",
          after: [{ from: "agent", text: "The payment was attempted and the card was declined, so nothing came off it. Do you want to put a different card on the account?" }],
          next: [
            {
              reply: "Yes, change the card",
              after: [{ from: "agent", text: "This page is only for the card. Nothing is charged from this text." }],
              jit: "payment",
              task: "method",
            },
            {
              reply: "Not now",
              after: [{ from: "agent", text: "Then no further payment will be attempted on that card. Reply if you want to change it later." }],
            },
          ],
        },
      ],
    },
  ];
}
type PendingReply = { text: string; previousCount: number };

function clock(iso: string, timezone: string | null) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timezone ?? "UTC" }).format(new Date(iso));
}
function day(iso: string, timezone: string | null) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: timezone ?? "UTC" }).format(new Date(iso));
}

export function ImessageDemo({ view, busy, act, open, onOpenJit, onPreview }: {
  view: SessionView; busy: boolean; act: Act;
  open: (id: string) => Promise<void>; onOpenJit: (actionId: string) => void;
  onPreview: (task: LibraryTaskId) => void;
}) {
  const creditor = view.portal.creditor_display_name.replace(/\s*\(synthetic\)\s*$/i, "");
  const amount = view.account.balance_usd == null ? "still outstanding" : money(view.account.balance_usd);
  const moments = momentsFor(creditor, amount);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingReply | null>(null);
  const [scene, setScene] = useState(0);
  const [path, setPath] = useState<number[]>([]);
  const [live, setLive] = useState(false);
  const thread = useRef<HTMLDivElement>(null);
  const scrollKey = `resolution-scroll-${view.session_id}`;
  const restored = useRef(false);
  const shouldFollow = useRef(true);
  const sending = useRef(false);
  const processing = busy || pending !== null;
  const visible = view.conversation.messages.filter((message) =>
    message.direction === "inbound" || ["baseline_preview_not_sent", "simulated_service_reply", "simulated_proactive_send"].includes(message.status));
  const messages = pending ? visible.filter((message) => view.conversation.messages.indexOf(message) < pending.previousCount) : visible;
  const suppressed = view.conversation.messages.filter((message) => message.status === "suppressed").at(-1);

  const moment = moments[scene] ?? moments[0];
  const threadParts = [{ lines: moment.bubbles, jit: moment.jit, task: moment.task }];
  let pendingChoices = moment.choices;
  for (const index of path) {
    const choice = pendingChoices[index];
    if (!choice) break;
    threadParts.push({ lines: [{ from: "user", text: choice.reply }, ...choice.after], jit: choice.jit, task: choice.task });
    pendingChoices = choice.next ?? [];
  }
  const opening = moments[0].bubbles.map((line) => line.text);

  useEffect(() => {
    const node = thread.current;
    if (!node) return;
    if (!restored.current) {
      const saved = sessionStorage.getItem(scrollKey);
      node.scrollTop = saved === null ? node.scrollHeight : Number(saved);
      restored.current = true;
    } else if (shouldFollow.current || pending) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages.length, pending, scene, path, live, scrollKey]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || processing || sending.current) return;
    sending.current = true;
    shouldFollow.current = true;
    setLive(true);
    setPending({ text: trimmed, previousCount: view.conversation.messages.length });
    setDraft("");
    const [ok] = await Promise.all([
      act({ type: "receive_sms", text: trimmed }),
      new Promise<void>((resolve) => setTimeout(resolve, 450)),
    ]);
    if (!ok) setDraft(trimmed);
    setPending(null);
    sending.current = false;
  }
  function loadScene(index: number) {
    if (processing) return;
    setLive(false);
    setPath([]);
    setScene(index);
    shouldFollow.current = true;
  }

  return <div className="imsg-page phone-only">
    <aside className="imsg-rail" aria-label="Conversation moments">
      <div className="imsg-rail-heading">
        <h2>Conversation</h2><span>{scene + 1} / {moments.length}</span>
      </div>
      <nav className="imsg-moments" aria-label="Choose a conversation moment">
        {moments.map((item, index) => <button key={item.label} type="button" className={!live && scene === index ? "on" : ""} aria-current={!live && scene === index ? "step" : undefined} onClick={() => loadScene(index)} disabled={processing}>
          <span className="imsg-moment-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong><ChevronRight className="imsg-moment-arrow" size={16} aria-hidden="true" />
        </button>)}
      </nav>
      <div className="imsg-rail-actions">
        <button type="button" className="imsg-next" disabled={processing} onClick={() => scene >= moments.length - 1 ? void open(view.scenario_id) : loadScene(scene + 1)}>
          {scene >= moments.length - 1 ? "Reset conversation" : "Next moment"}{scene >= moments.length - 1 ? <RotateCcw size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
        </button>
        <p className="imsg-rail-note">Each moment is a message we send when something happens on the account. The faded line is a reply they might send.</p>
      </div>
      <p className="imsg-simulation"><span /> Simulated SMS · no messages sent</p>
    </aside>
    <div className="imsg-stage">
      <p className="imsg-demo-label">SMS SIMULATOR <span>All messages are simulated</span></p>
      <div className="imsg-phone" aria-label="iPhone message simulator">
        <span className="imsg-button imsg-button-silent" /><span className="imsg-button imsg-button-volume-up" /><span className="imsg-button imsg-button-volume-down" /><span className="imsg-button imsg-button-power" />
        <div className="imsg-bezel"><div className="imsg-screen">
          <div className="imsg-island" aria-hidden="true" />
          <div className="imsg-status"><span>{clock(view.now_utc, view.account.timezone)}</span><span className="imsg-status-icons" aria-hidden="true"><i /><i /><b /></span></div>
          <header className="imsg-nav"><span className="imsg-back" aria-hidden="true">‹</span><div className="imsg-who"><span className="imsg-avatar" aria-hidden="true">DR</span><strong>Debt Recovery</strong><small>Account assistance</small></div></header>
          <div className="imsg-thread" ref={thread} role="log" aria-label="SMS conversation history" aria-live="polite" aria-busy={pending !== null} onScroll={() => {
            if (!thread.current) return;
            shouldFollow.current = thread.current.scrollHeight - thread.current.scrollTop - thread.current.clientHeight < 60;
            sessionStorage.setItem(scrollKey, String(thread.current.scrollTop));
          }}>
            {live ? messages.map((message, index) => {
              const action = view.conversation.jit_actions.find((candidate) => candidate.id === message.jit_action_id);
              const previous = messages[index - 1];
              const showDate = !previous || day(previous.at_utc, view.account.timezone) !== day(message.at_utc, view.account.timezone);
              const baseline = messages.slice(0, index).filter((item) => item.status === "baseline_preview_not_sent").length;
              const text = message.status === "baseline_preview_not_sent" ? opening[baseline] ?? message.text : message.text;
              return <Fragment key={message.id}>
                {showDate && <p className="imsg-when">{day(message.at_utc, view.account.timezone)} · {clock(message.at_utc, view.account.timezone)}</p>}
                <p className={`imsg-bubble ${message.direction === "inbound" ? "user" : "agent"}`}>{text}</p>
                {action && <JitMessagePreview state={action.state} disabled={processing} onOpen={() => onOpenJit(action.id)} />}
                <span className={`imsg-message-time ${message.direction === "inbound" ? "user" : "agent"}`}>{clock(message.at_utc, view.account.timezone)}{action?.status === "completed" ? " · Task completed" : message.kind === "scheduled_followup" ? " · Follow-up" : ""}</span>
              </Fragment>;
            }) : <>
              <p className="imsg-section"><span>{moment.when}</span><strong>{moment.trigger}</strong></p>
              {threadParts.map((part, partIndex) => part.lines.map((line, index) => {
                const lastAgent = line.from === "agent" && part.lines.slice(index + 1).every((item) => item.from !== "agent");
                return <Fragment key={`${moment.label}-${partIndex}-${index}`}>
                  <p className={`imsg-bubble ${line.from === "user" ? "user" : "agent"}`}>{line.text}</p>
                  {lastAgent && part.jit && part.task && <JitMessagePreview state={part.jit} disabled={processing} onOpen={() => onPreview(part.task!)} />}
                </Fragment>;
              }))}
              {!processing && pendingChoices.length > 0 && <div className="imsg-ghosts">
                {pendingChoices.map((choice, index) => <button key={choice.reply} type="button" onClick={() => { shouldFollow.current = true; setPath((current) => [...current, index]); }}>{choice.reply}</button>)}
              </div>}
            </>}
            {live && pending && <><p className="imsg-bubble user">{pending.text}</p><p className="imsg-bubble agent imsg-typing" aria-label="Checking context and preparing a reply"><span /><span /><span /></p></>}
          </div>
          <div className="imsg-disclosure" title={view.message.disclosure_text}>Fixed demo disclosure · {view.message.disclosure_version} · Reply STOP to opt out</div>
          <form className="imsg-compose" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
            <label className="sr-only" htmlFor="agent-reply">Message</label>
            <textarea id="agent-reply" rows={1} value={draft} placeholder="Text message" autoComplete="off" maxLength={1000} disabled={processing} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); }
            }} />
            <button type="submit" aria-label="Send" disabled={processing || !draft.trim()}>↑</button>
          </form>
          <div className="imsg-home" aria-hidden="true" />
        </div></div>
      </div>
      {suppressed && <p className="imsg-suppressed" role="status">Reply withheld by the policy engine. {humanise(view.conversation.decision?.chosen_action ?? "inspect source state")}.</p>}
    </div>

  </div>;
}
