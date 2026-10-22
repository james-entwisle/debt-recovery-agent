"use client";

import { Button } from "@heroui/react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  GitBranch,
  Mail,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { dateTime, humanise, money, type SessionView } from "@/lib/api";
import type { Act } from "./resolution-app";

function CheckRow({
  label,
  pass,
  value,
}: {
  label: string;
  pass: boolean;
  value?: string;
}) {
  return (
    <div className={`check-row ${pass ? "pass" : "fail"}`}>
      <span>
        {pass ? <Check size={14} /> : <X size={14} />}
        {label}
      </span>
      <strong>{value ?? (pass ? "Passed" : "Blocked")}</strong>
    </div>
  );
}

export function JourneySimulator({
  view,
  act,
  busy,
  open,
  onPortal,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
  open: (id: string, arm?: string) => Promise<void>;
  onPortal: () => void;
}) {
  const { decision, account } = view;
  const checks = decision.eligibility;
  const proposal = decision.proposal;
  const suppressed = decision.outcome === "SUPPRESS";
  const queued = view.contacts.find((c) => c.status === "queued");
  const timezone = account.timezone;
  function advance(minutes: number) {
    return act({
      type: "advance",
      to_utc: new Date(
        new Date(view.now_utc).getTime() + minutes * 60000,
      ).toISOString(),
    });
  }
  const sourceRows = [
    [
      "Balance",
      account.balance_usd === null ? "Unknown" : money(account.balance_usd),
    ],
    ["Payment", account.payment_status ?? "Unknown"],
    ["Plan", account.plan_status ?? "Unknown"],
    [
      "Email permission",
      account.email_allowed === null
        ? "Unknown"
        : account.email_allowed
          ? "Allowed"
          : "Denied",
    ],
    [
      "SMS permission",
      account.sms_allowed === null
        ? "Unknown"
        : account.sms_allowed
          ? "Allowed"
          : "Denied",
    ],
    ["Holds", account.holds?.join(", ") || "None"],
  ];

  return (
    <div className="simulator">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ADAPTIVE RESOLUTION / OPERATIONS</p>
          <h1>Journey simulator</h1>
          <p>Replay events and inspect contact decisions.</p>
        </div>
        <Button variant="outline" onPress={onPortal}>
          Open consumer portal <ArrowRight size={16} />
        </Button>
      </header>
      <details className="scenario-guide">
        <summary>S04–S06 replay guide</summary>
        <p>
          S04 adapts an incomplete-plan journey. In S05 and S06, advance 15
          minutes to inspect the source-state change before its event arrives.
          Advance another 15 minutes to receive the delayed event.
        </p>
      </details>
      <section className="replay-controls" aria-label="Replay controls">
        <div>
          <span className="tiny-label">SIMULATED CLOCK</span>
          <strong>{dateTime(view.now_utc, timezone)}</strong>
          <span className="small muted">
            {timezone ?? "Unknown timezone"} · Revision {view.revision}
          </span>
        </div>
        <div className="replay-buttons">
          <Button
            size="sm"
            variant="secondary"
            isDisabled={busy}
            onPress={() => void advance(15)}
          >
            <Clock3 size={15} />
            +15 min
          </Button>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={busy}
            onPress={() => void advance(60)}
          >
            +1 hour
          </Button>
          <Button
            size="sm"
            variant="outline"
            isDisabled={busy}
            onPress={() => void act({ type: "evaluate" })}
          >
            <RefreshCw size={14} />
            Recheck
          </Button>
          <Button
            size="sm"
            variant={view.stopped ? "primary" : "outline"}
            isDisabled={busy}
            onPress={() =>
              void act({ type: "set_stop", stopped: !view.stopped })
            }
          >
            {view.stopped ? <Play size={14} /> : <Pause size={14} />}{" "}
            {view.stopped ? "Resume pilot" : "Stop pilot"}
          </Button>
        </div>
      </section>
      <div className="simulator-grid">
        <div className="simulator-primary">
          <section
            className={`decision-panel ${suppressed ? "suppressed" : ""}`}
          >
            <div className="section-top">
              <span className="tiny-label">CURRENT DECISION</span>
              <span
                className={`status-badge ${suppressed ? "amber" : "green"}`}
              >
                {humanise(decision.outcome)}
              </span>
            </div>
            <h2>
              {suppressed
                ? "Contact is suppressed."
                : decision.outcome === "ROUTE_TO_SUPPORT"
                  ? "Make room for assistance."
                  : decision.outcome === "NO_ACTION"
                    ? "No new action needed."
                    : "Adapt the existing journey."}
            </h2>
            <div className="reason-codes">
              {decision.reason_codes.map((reason) => (
                <code key={reason}>{reason}</code>
              ))}
            </div>
            <p className="small muted">
              {decision.policy_version} · Evaluated{" "}
              {dateTime(decision.evaluated_at_utc, timezone)}
            </p>
            <div className="decision-actions">
              <Button
                size="sm"
                isDisabled={busy || !proposal}
                onPress={() =>
                  void act(
                    { type: "schedule" },
                    "Proposal applied to the existing queued contact. No message sent.",
                  )
                }
              >
                Apply proposal <ChevronRight size={15} />
              </Button>
              {queued && (
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={busy}
                  onPress={() =>
                    void act(
                      { type: "handoff", contact_id: queued.contact_id },
                      "Handoff checked against current source state. Inspect the queue and audit result.",
                    )
                  }
                >
                  Check handoff now <ShieldCheck size={15} />
                </Button>
              )}
              {queued && (
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={busy}
                  onPress={() =>
                    void act(
                      { type: "advance", to_utc: queued.scheduled_at_utc },
                      "Replay advanced through source changes and the contact deadline.",
                    )
                  }
                >
                  Advance to queued contact <ArrowRight size={15} />
                </Button>
              )}
            </div>
          </section>
          <section className="sim-section">
            <div className="section-top">
              <h2>Original → adapted schedule</h2>
              <span className="small muted">Same contact ID</span>
            </div>
            <div className="schedule-comparison">
              <div>
                <span className="tiny-label">ORIGINAL</span>
                {view.original_contacts.map((c) => (
                  <div className="contact-row" key={c.contact_id}>
                    <span className="channel-icon">
                      {c.channel === "sms" ? (
                        <Smartphone size={18} />
                      ) : (
                        <Mail size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{humanise(c.template_id)}</strong>
                      <p>{dateTime(c.scheduled_at_utc, timezone)}</p>
                      <span className="small muted">
                        {c.contact_id} · {c.channel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <span className="tiny-label">CURRENT QUEUE</span>
                {view.contacts.map((c) => (
                  <div className="contact-row" key={c.contact_id}>
                    <span className="channel-icon adapted">
                      {c.status === "suppressed" ? (
                        <ShieldCheck size={18} />
                      ) : (
                        <GitBranch size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{humanise(c.template_id)}</strong>
                      <p>{dateTime(c.scheduled_at_utc, timezone)}</p>
                      <span
                        className={`status-badge ${c.status === "suppressed" ? "amber" : ""}`}
                      >
                        {humanise(c.status ?? "queued")}
                      </span>
                      <span className="small muted"> · {c.contact_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="small muted">
              A proposal becomes queued only when applied. Source state and the
              shared contact budget are rechecked before a simulated provider
              handoff.
            </p>
          </section>
          <section className="sim-section">
            <div className="section-top">
              <h2>Event timeline</h2>
              <span className="small muted">Received events only</span>
            </div>
            <ol className="event-timeline">
              {view.events.map((e) => (
                <li key={e.event_id}>
                  <span className="timeline-dot" />
                  <div>
                    <strong>{humanise(e.type)}</strong>
                    <span className="small muted">{e.event_id}</span>
                    <p>Occurred {dateTime(e.occurred_at_utc, timezone)}</p>
                    <p className="small muted">
                      Received {dateTime(e.ingested_at_utc, timezone)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <details className="audit-details">
              <summary>Decision audit · {view.audit.length} records</summary>
              <ol>
                {view.audit.toReversed().map((item) => (
                  <li key={item.sequence}>
                    <div>
                      <strong>{humanise(item.event)}</strong>
                      <span className="small muted">
                        {dateTime(item.at_utc, timezone)}
                      </span>
                    </div>
                    <pre>{JSON.stringify(item.details, null, 2)}</pre>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        </div>
        <aside className="simulator-secondary">
          <section className="sim-section checks-section">
            <div className="section-top">
              <h2>Eligibility checks</h2>
              <ShieldCheck size={18} />
            </div>
            <CheckRow
              label="Authoritative source"
              pass={checks.source_eligible}
            />
            <CheckRow
              label="Permitted contact window"
              pass={checks.in_contact_window}
            />
            <CheckRow
              label="24-hour shared budget"
              pass={checks.attempts_24h < 1}
              value={`${checks.attempts_24h} / 1 used`}
            />
            <CheckRow
              label="7-day shared budget"
              pass={checks.attempts_7d < 3}
              value={`${checks.attempts_7d} / 3 used`}
            />
            <CheckRow
              label="Email permission"
              pass={checks.email_allowed === true}
            />
            <CheckRow
              label="SMS permission"
              pass={checks.sms_allowed === true}
            />
            {checks.restriction_reasons.length > 0 && (
              <div className="reason-codes compact">
                {checks.restriction_reasons.map((r) => (
                  <code key={r}>{r}</code>
                ))}
              </div>
            )}
            <details className="source-details">
              <summary>Inspect current account state</summary>
              <dl>
                {sourceRows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
          <section className="message-section">
            <div className="section-top">
              <h2>Message preview</h2>
              <FileText size={17} />
            </div>
            <span className="status-badge">
              {suppressed
                ? "Suppressed · reference only"
                : proposal
                  ? "Proposed · not sent"
                  : "Reference template"}
            </span>
            <div className="message-preview">
              <span className="tiny-label">{view.message.template_id}</span>
              <h3>{view.message.subject}</h3>
              <p>{view.message.body}</p>
              <Button size="sm" variant="outline" onPress={onPortal}>
                View account <ArrowRight size={14} />
              </Button>
              <div className="disclosure-block">
                <strong>{view.message.disclosure_label}</strong>
                <span>{view.message.disclosure_version}</span>
                <p>{view.message.disclosure_text}</p>
              </div>
            </div>
            <p className="small muted">
              {view.message.approval} No live AI or provider is used.
            </p>
          </section>
          <section className="experiment-section">
            <span className="tiny-label">EXPERIMENT PREVIEW</span>
            <label htmlFor="arm">
              Counterfactual journey
              <select
                id="arm"
                value={view.experiment.preview_arm}
                disabled={busy}
                onChange={(e) => void open(view.scenario_id, e.target.value)}
              >
                <option value="treatment">Treatment · adaptive journey</option>
                <option value="control">Control · existing journey</option>
              </select>
            </label>
            <p className="small muted">
              Synthetic assigned arm: {view.experiment.assigned_arm}. Changing
              this preview opens a fresh session; it does not change assignment.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
