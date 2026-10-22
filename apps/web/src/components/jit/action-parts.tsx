"use client";
import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Plus,
} from "lucide-react";
import { date, money, type PaymentMethod, type PlanOption } from "@/lib/api";

export function ActionHeader({
  title,
  description,
  step,
  onBack,
}: {
  title: string;
  description?: string;
  step?: string;
  onBack?: () => void;
}) {
  return (
    <header className="jit-action-header">
      {onBack && (
        <Button variant="ghost" size="sm" className="jit-back" onPress={onBack}>
          <ArrowLeft size={15} />
          Back
        </Button>
      )}
      {step && <p className="jit-step-label">{step}</p>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}
export function ActionFooter({
  children,
  onCancel,
  busy = false,
}: {
  children?: ReactNode;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <footer className="jit-action-footer">
      {children}
      <Button variant="ghost" size="sm" isDisabled={busy} onPress={onCancel}>
        Return to conversation
      </Button>
    </footer>
  );
}
export function ActionResult({
  title,
  description,
  pending = false,
  children,
  onDone,
}: {
  title: string;
  description: string;
  pending?: boolean;
  children?: ReactNode;
  onDone: () => void;
}) {
  return (
    <div className="jit-action-result">
      <span className="jit-result-icon">
        {pending ? <Clock3 size={27} /> : <CheckCircle2 size={27} />}
      </span>
      <ActionHeader title={title} description={description} />
      {children}
      <div className="jit-result-actions">
        <Button className="full-action" onPress={onDone}>
          Back to conversation <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function ScheduleSummary({
  option,
  expanded = false,
}: {
  option: Pick<
    PlanOption,
    | "payment_schedule"
    | "first_payment_date"
    | "last_payment_date"
    | "total_usd"
  >;
  expanded?: boolean;
}) {
  return (
    <div className="jit-schedule-summary">
      <dl className="jit-key-values">
        <div>
          <dt>First payment</dt>
          <dd>{date(option.first_payment_date)}</dd>
        </div>
        <div>
          <dt>Scheduled completion</dt>
          <dd>{date(option.last_payment_date)}</dd>
        </div>
        <div>
          <dt>Total payments</dt>
          <dd>{money(option.total_usd)}</dd>
        </div>
      </dl>
      <details className="jit-payment-dates" open={expanded || undefined}>
        <summary>
          <CalendarDays size={15} />
          All payment dates
          <ChevronDown size={14} />
        </summary>
        <ol>
          {option.payment_schedule.map((p, index) => (
            <li key={`${p.date}-${index}`}>
              <span>{date(p.date)}</span>
              <strong>{money(p.amount_usd)}</strong>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
export function MethodPicker({
  methods,
  selected,
  onSelect,
  onAdd,
  busy,
}: {
  methods: PaymentMethod[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAdd: () => Promise<boolean>;
  busy: boolean;
}) {
  return (
    <div className="jit-method-picker">
      <fieldset>
        <legend className="sr-only">Choose a payment method</legend>
        {methods
          .filter((m) => m.eligible)
          .map((method) => (
            <label
              key={method.id}
              className={`jit-method-option ${selected === method.id ? "selected" : ""}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.id}
                checked={selected === method.id}
                onChange={() => onSelect(method.id)}
                disabled={busy}
              />
              <CreditCard size={22} />
              <span>
                <strong>{method.label.replace(/\s+ending\s+\d{4}$/i, "")}</strong>
                <small>Ending in {method.last4}</small>
              </span>
            </label>
          ))}
      </fieldset>
      <Button
        variant="outline"
        className="jit-add-method"
        isDisabled={busy || methods.length > 1}
        onPress={() => void onAdd()}
      >
        <Plus size={16} />
        {methods.length > 1 ? "Card added" : "Add another card"}
      </Button>
      <p className="jit-helper">
        No card number is entered, and nothing is charged.
      </p>
    </div>
  );
}
