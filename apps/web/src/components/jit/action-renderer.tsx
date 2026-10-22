"use client";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import {
  date,
  dateTime,
  humanise,
  money,
  type JitState,
  type SessionView,
} from "@/lib/api";
import type { Act } from "../resolution-app";
import { isPlanSetup } from "./action-config";
import {
  ActionFooter,
  ActionHeader,
  ActionResult,
  MethodPicker,
} from "./action-parts";
import { PlanSetupFlow } from "./plan-setup-flow";

type ActionProps = {
  state: JitState;
  view: SessionView;
  act: Act;
  busy: boolean;
  onLeave: () => void;
  onTask: (state: JitState) => void;
};
export function JitActionRenderer(props: ActionProps) {
  const { state, view, onLeave, onTask } = props;
  if (
    view.account.payment_status === "pending" &&
    state !== "help" &&
    state !== "clarification" &&
    state !== "account"
  )
    return (
      <ActionResult
        title="Payment pending"
        description={`${view.payment ? money(view.payment.amount_usd) + " payment is processing." : "Your payment is processing."}`}
        pending
        onDone={onLeave}
      >
        {view.confirmed_plan && (
          <p className="jit-important-note">
            Your plan stays active, with future payments still scheduled.
          </p>
        )}
      </ActionResult>
    );
  if (
    view.account.payment_status === "settled" &&
    state !== "help" &&
    state !== "clarification"
  )
    return (
      <ActionResult
        title="Payment status updated"
        description="The account service reports a settled payment. Review the current account before another payment action."
        onDone={onLeave}
      />
    );
  if (isPlanSetup(state)) return <PlanSetupFlow {...props} />;
  if (state === "change_date" || state === "change_frequency")
    return (
      <PlanChangeAction
        {...props}
        kind={state === "change_date" ? "date" : "frequency"}
      />
    );
  if (state === "early_payoff" || state === "payment")
    return <PaymentAction {...props} payoff={state === "early_payoff"} />;
  if (state === "active_plan") return <ActivePlanAction {...props} />;
  if (state === "pending")
    return (
      <>
        <ActionHeader
          title="No payment is pending"
          description="The latest account check has no payment in progress."
        />
        <ActionFooter onCancel={onLeave} />
      </>
    );
  return (
    <AssistanceAction
      {...props}
      clarification={state === "account" || state === "clarification"}
      onTask={onTask}
    />
  );
}

function ActivePlanAction({ view, onTask, onLeave }: ActionProps) {
  const plan = view.confirmed_plan;
  if (!plan)
    return (
      <>
        <ActionHeader
          title="An active plan is needed"
          description="A payment plan needs to be in place before this can be shown."
        />
        <ActionFooter onCancel={onLeave} />
      </>
    );
  return (
    <>
      <ActionHeader
        title="Your payment plan"
        description={`${money(plan.instalment_usd)} ${plan.frequency}.`}
      />
      <dl className="jit-key-values">
        <div>
          <dt>Next scheduled payment</dt>
          <dd>{date(plan.first_payment_date)}</dd>
        </div>
        <div>
          <dt>Scheduled completion</dt>
          <dd>{date(plan.last_payment_date)}</dd>
        </div>
        <div>
          <dt>Remaining balance</dt>
          <dd>
            {view.account.balance_usd === null
              ? "Unavailable"
              : money(view.account.balance_usd)}
          </dd>
        </div>
        <div>
          <dt>Payment method</dt>
          <dd>{plan.payment_method_label ?? "Simulated method"}</dd>
        </div>
      </dl>
      <div className="jit-management-links">
        <Button variant="outline" onPress={() => onTask("change_date")}>
          <CalendarDays size={16} />
          Request a date change
          <ArrowRight size={15} />
        </Button>
        <Button variant="outline" onPress={() => onTask("change_frequency")}>
          Request a frequency change
          <ArrowRight size={15} />
        </Button>
        <Button variant="outline" onPress={() => onTask("early_payoff")}>
          Pay off the balance
          <ArrowRight size={15} />
        </Button>
      </div>
      <ActionFooter onCancel={onLeave} />
    </>
  );
}

function PlanChangeAction({
  view,
  act,
  busy,
  onLeave,
  kind,
}: ActionProps & { kind: "date" | "frequency" }) {
  const [requestedDate, setRequestedDate] = useState(
    view.preferences.payday ?? view.confirmed_plan?.first_payment_date ?? "",
  );
  const [frequency, setFrequency] = useState("");
  const [review, setReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validation, setValidation] = useState("");
  const plan = view.confirmed_plan;
  const request = view.plan_change_requests.findLast(
    (item) =>
      item.change_type === kind &&
      (kind === "date"
        ? item.requested_date === requestedDate
        : item.requested_frequency === frequency),
  );
  if (!plan)
    return (
      <>
        <ActionHeader
          title="This action needs an active plan"
          description="A payment plan needs to be in place before this can be changed."
        />
        <ActionFooter onCancel={onLeave} />
      </>
    );
  if (submitted && request)
    return (
      <ActionResult
        title={`${kind === "date" ? "Date" : "Frequency"} change requested`}
        description="Your request is with our team. Your current plan stays in place."
        onDone={onLeave}
      >
        <dl className="jit-key-values">
          <div>
            <dt>Request reference</dt>
            <dd>{request.id}</dd>
          </div>
          <div>
            <dt>Requested {kind}</dt>
            <dd>
              {kind === "date"
                ? date(request.requested_date ?? requestedDate)
                : humanise(request.requested_frequency ?? frequency)}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Awaiting review</dd>
          </div>
        </dl>
        <p className="jit-helper">
          Requests are reviewed during weekday business hours.
        </p>
      </ActionResult>
    );
  const title =
    kind === "date"
      ? "Change your next payment date"
      : "Change payment frequency";
  function next() {
    if (
      kind === "date" &&
      (!requestedDate ||
        requestedDate < view.now_utc.slice(0, 10) ||
        requestedDate === plan?.first_payment_date)
    ) {
      setValidation("Choose a different date, today or later.");
      return;
    }
    if (kind === "frequency" && (!frequency || frequency === plan?.frequency)) {
      setValidation("Choose a different payment frequency.");
      return;
    }
    setValidation("");
    setReview(true);
  }
  return (
    <>
      <ActionHeader
        title={review ? "Review your change request" : title}
        description={
          review ? undefined : "Our team needs to approve changes to this plan."
        }
        onBack={review ? () => setReview(false) : undefined}
      />
      <dl className="jit-key-values">
        <div>
          <dt>
            {kind === "date" ? "Current payment date" : "Current frequency"}
          </dt>
          <dd>
            {kind === "date"
              ? date(plan.first_payment_date)
              : humanise(plan.frequency)}
          </dd>
        </div>
        {review && (
          <div>
            <dt>
              {kind === "date" ? "Requested date" : "Requested frequency"}
            </dt>
            <dd>
              {kind === "date" ? date(requestedDate) : humanise(frequency)}
            </dd>
          </div>
        )}
      </dl>
      {!review && (
        <div className="jit-form-fields">
          {kind === "date" ? (
            <label>
              Preferred payment date
              <input
                type="date"
                min={view.now_utc.slice(0, 10)}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                disabled={busy}
              />
            </label>
          ) : (
            <label>
              Preferred frequency
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                disabled={busy}
              >
                <option value="">Choose a frequency</option>
                {["weekly", "fortnightly", "monthly"]
                  .filter((value) => value !== plan.frequency)
                  .map((value) => (
                    <option key={value} value={value}>
                      {humanise(value)}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      )}
      <p className="jit-important-note">
        Keep following your current schedule until the change is approved.
      </p>
      {validation && (
        <p className="field-error" role="alert">
          {validation}
        </p>
      )}
      <ActionFooter onCancel={onLeave} busy={busy}>
        {review ? (
          <Button
            className="full-action"
            isDisabled={busy}
            onPress={async () => {
              const command =
                kind === "date"
                  ? ({
                      type: "request_plan_change",
                      change_type: "date",
                      requested_date: requestedDate,
                    } satisfies Parameters<Act>[0])
                  : ({
                      type: "request_plan_change",
                      change_type: "frequency",
                      requested_frequency: frequency,
                    } satisfies Parameters<Act>[0]);
              if (await act(command)) setSubmitted(true);
            }}
          >
            Send {kind} change request <Check size={16} />
          </Button>
        ) : (
          <Button className="full-action" isDisabled={busy} onPress={next}>
            Review request <ArrowRight size={16} />
          </Button>
        )}
      </ActionFooter>
    </>
  );
}

function PaymentAction({
  view,
  act,
  busy,
  onLeave,
  payoff,
}: ActionProps & { payoff: boolean }) {
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [reviewedAmount, setReviewedAmount] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [validation, setValidation] = useState("");
  const balance = view.account.balance_usd;
  const method = view.portal.payment_methods.find(
    (m) => m.id === methodId && m.eligible,
  );
  const value = payoff ? balance : Number(amount);
  function next() {
    if (
      value === null ||
      !Number.isFinite(value) ||
      value <= 0 ||
      balance === null ||
      value > balance
    ) {
      setValidation(
        "Enter an amount above $0 and no more than the current balance.",
      );
      return;
    }
    if (!method) {
      setValidation("Choose a payment method.");
      return;
    }
    setValidation("");
    setReviewedAmount(value);
    setConsent(false);
  }
  const stale = payoff && reviewedAmount !== null && reviewedAmount !== balance;
  return (
    <>
      <ActionHeader
        title={
          reviewedAmount !== null
            ? "Review your payment"
            : payoff
              ? "Pay off your balance"
              : "Make a one-off payment"
        }
        description={
          payoff
            ? "The current balance, checked with the account service."
            : undefined
        }
        onBack={
          reviewedAmount !== null
            ? () => {
                setReviewedAmount(null);
                setConsent(false);
              }
            : undefined
        }
      />
      {reviewedAmount === null ? (
        <>
          <div className="jit-payment-balance">
            <span>
              {payoff ? "Outstanding balance" : "Verified account balance"}
            </span>
            <strong>{balance === null ? "Unavailable" : money(balance)}</strong>
            <small>
              Checked {dateTime(view.now_utc, view.account.timezone)}
            </small>
          </div>
          {!payoff && (
            <div className="jit-form-fields">
              <label>
                Payment amount, USD
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  max={balance ?? 0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                  placeholder="0.00"
                />
              </label>
            </div>
          )}
          <h3 className="jit-form-subtitle">Payment method</h3>
          <MethodPicker
            methods={view.portal.payment_methods}
            selected={methodId}
            onSelect={setMethodId}
            onAdd={() => act({ type: "add_demo_payment_method" })}
            busy={busy}
          />
        </>
      ) : (
        <>
          <div className="jit-payment-balance">
            <span>Amount to pay</span>
            <strong>{money(reviewedAmount)}</strong>
          </div>
          <dl className="jit-key-values">
            <div>
              <dt>Payment method</dt>
              <dd>{method ? method.label : "Method unavailable"}</dd>
            </div>
            <div>
              <dt>Result when submitted</dt>
              <dd>Pending</dd>
            </div>
          </dl>
          <label className="jit-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy}
            />
            <span>
              I choose to make this simulated payment. No real card is charged
              or funds moved.
            </span>
          </label>
        </>
      )}
      {payoff && view.confirmed_plan && (
        <p className="jit-important-note">
          Your active plan and future instalments are not cancelled or changed
          by this payment request.
        </p>
      )}
      {stale && (
        <p className="field-error" role="alert">
          The balance changed. Go back and review the current amount.
        </p>
      )}
      {validation && (
        <p className="field-error" role="alert">
          {validation}
        </p>
      )}
      <ActionFooter onCancel={onLeave} busy={busy}>
        {reviewedAmount === null ? (
          <Button
            className="full-action"
            isDisabled={busy || balance === null || !method}
            onPress={next}
          >
            Review payment <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            className="full-action"
            isDisabled={busy || !consent || !method || stale}
            onPress={() => {
              if (method && reviewedAmount !== null)
                void act(
                  payoff
                    ? {
                        type: "simulate_early_payoff",
                        confirmed: true,
                        reviewed_balance_usd: reviewedAmount,
                        payment_method_id: method.id,
                      }
                    : {
                        type: "simulate_payment",
                        confirmed: true,
                        amount_usd: reviewedAmount,
                        payment_method_id: method.id,
                      },
                );
            }}
          >
            Confirm simulated payment <Check size={16} />
          </Button>
        )}
      </ActionFooter>
    </>
  );
}

export function UpdateMethodAction({
  view,
  act,
  busy,
  onLeave,
}: ActionProps) {
  const plan = view.confirmed_plan;
  const [methodId, setMethodId] = useState<string | null>(
    plan?.payment_method_id ??
      view.portal.payment_methods.find((method) => method.eligible)?.id ??
      null,
  );
  const [saved, setSaved] = useState(false);
  const method = view.portal.payment_methods.find(
    (item) => item.id === methodId && item.eligible,
  );
  if (!plan)
    return (
      <>
        <ActionHeader
          title="Update your payment method"
          description="A payment plan needs to be in place before the method can be changed."
        />
        <ActionFooter onCancel={onLeave} />
      </>
    );
  if (saved && method)
    return (
      <ActionResult
        title="Payment method updated"
        description={`${method.label} is selected for future payments. Nothing was charged, and your instalments stay the same.`}
        onDone={onLeave}
      />
    );
  return (
    <>
      <ActionHeader
        title="Update your payment method"
        description="Choose the card for future payments. This does not take a payment."
      />
      <dl className="jit-key-values">
        <div>
          <dt>Current method</dt>
          <dd>{plan.payment_method_label ?? "Payment method on file"}</dd>
        </div>
      </dl>
      <MethodPicker
        methods={view.portal.payment_methods}
        selected={methodId}
        onSelect={setMethodId}
        onAdd={() => act({ type: "add_demo_payment_method" })}
        busy={busy}
      />
      <p className="jit-important-note">
        Instalment amounts and dates stay the same.
      </p>
      <ActionFooter onCancel={onLeave} busy={busy}>
        <Button
          className="full-action"
          isDisabled={busy || !method}
          onPress={() => setSaved(true)}
        >
          Use this method <Check size={16} />
        </Button>
      </ActionFooter>
    </>
  );
}

function AssistanceAction({
  view,
  act,
  busy,
  onLeave,
  clarification,
}: ActionProps & { clarification: boolean }) {
  const latest = view.support_requests.at(-1);
  const [submitted, setSubmitted] = useState(false);
  if (submitted && latest)
    return (
      <ActionResult
        title="Your request is recorded"
        description="Our team reviews requests during weekday business hours. No agreement has been made."
        onDone={onLeave}
      >
        <dl className="jit-key-values">
          <div>
            <dt>Reference</dt>
            <dd>{latest.id}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{humanise(latest.status)}</dd>
          </div>
        </dl>
      </ActionResult>
    );
  return (
    <>
      <ActionHeader
        title={
          clarification ? "Check your account details" : "Ask our team for help"
        }
        description={
          clarification
            ? "These are the details the account service has provided."
            : "You don’t need to choose a payment plan to request support."
        }
      />
      {clarification && (
        <dl className="jit-key-values">
          <div>
            <dt>Creditor</dt>
            <dd>{view.portal.creditor_display_name}</dd>
          </div>
          <div>
            <dt>Outstanding balance</dt>
            <dd>
              {view.account.balance_usd === null
                ? "Unavailable"
                : money(view.account.balance_usd)}
            </dd>
          </div>
          <div>
            <dt>Account reference</dt>
            <dd>{view.consumer_id}</dd>
          </div>
        </dl>
      )}
      <p className="jit-helper">
        A request routes to a person. It does not decide a dispute or apply a
        formal account hold.
      </p>
      <ActionFooter onCancel={onLeave} busy={busy}>
        <Button
          className="full-action"
          isDisabled={busy}
          onPress={async () => {
            if (await act({ type: "request_help" })) setSubmitted(true);
          }}
        >
          Request assistance <ArrowRight size={16} />
        </Button>
      </ActionFooter>
    </>
  );
}
