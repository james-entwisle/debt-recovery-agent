"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  HeartHandshake,
  Info,
  ReceiptText,
} from "lucide-react";
import {
  date,
  humanise,
  money,
  type Intent,
  type PlanOption,
  type Preferences,
  type SessionView,
} from "@/lib/api";
import type { Act } from "./resolution-app";

type Step = "choices" | "plans" | "payment" | "help";
const paymentChoices = [
  {
    intent: "explore_plan",
    title: "Set up a payment plan",
    description: "Split your balance into smaller payments",
    icon: ReceiptText,
  },
  {
    intent: "explore_payment",
    title: "Make a one-off payment",
    description: "Pay an amount of your choice",
    icon: CreditCard,
  },
] satisfies {
  intent: Intent;
  title: string;
  description: string;
  icon: typeof CreditCard;
}[];

export function ConsumerPortal({
  view,
  act,
  busy,
}: {
  view: SessionView;
  act: Act;
  busy: boolean;
}) {
  const [step, setStep] = useState<Step>("choices");
  const [payday, setPayday] = useState(view.preferences.payday ?? "");
  const [frequency, setFrequency] = useState(
    view.preferences.frequency ?? "any",
  );
  const [amount, setAmount] = useState(
    view.preferences.max_instalment_usd?.toString() ?? "",
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [review, setReview] = useState<{
    option: PlanOption;
    token: string;
  } | null>(null);
  const [consent, setConsent] = useState(false);
  const [validation, setValidation] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const matches = view.portal.options.filter((o) => o.matches);
  const blocked = !view.portal.can_confirm;
  const latestHelp = view.support_requests.at(-1);
  const creditor = view.portal.creditor_display_name.replace(
    /\s*\(synthetic\)\s*/i,
    "",
  );
  const incompletePlan = view.account.plan_status === "started";
  const summaryPlan = view.confirmed_plan ?? review?.option;
  const paymentPending = view.account.payment_status === "pending";
  const accountStatus = paymentPending
    ? "Payment pending"
    : view.confirmed_plan
      ? "Plan active"
      : incompletePlan
        ? "Setup in progress"
        : "Open";

  async function choose(intent: Intent) {
    if (
      !(await act(
        { type: "record_intent", intent },
        intent === "review_later"
          ? "Take your time. No commitment has been made."
          : undefined,
      ))
    )
      return;
    setValidation("");
    setReview(null);
    setConsent(false);
    switch (intent) {
      case "explore_plan":
        setStep("plans");
        break;
      case "payday_preference":
        setStep("plans");
        setPreferencesOpen(true);
        break;
      case "explore_payment":
        setStep("payment");
        break;
      case "review_later":
        setStep("choices");
        break;
      default:
        setStep("help");
    }
  }
  async function match() {
    if (
      amount !== "" &&
      (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
    ) {
      setValidation("Enter an amount above $0, or leave this blank.");
      return;
    }
    if (payday && payday < view.now_utc.slice(0, 10)) {
      setValidation("Choose today or later in the demo timeline.");
      return;
    }
    const preferences: Preferences = { frequency };
    if (payday) preferences.payday = payday;
    if (amount) preferences.max_instalment_usd = Number(amount);
    if (await act({ type: "match_preferences", preferences })) {
      setStep("plans");
      setReview(null);
      setConsent(false);
      setValidation("");
      setPreferencesOpen(false);
    }
  }

  return (
    <div className="portal-layout">
      <aside className="account-summary" aria-label="Account summary">
        <div className="account-identity">
          <span className="creditor-symbol">
            <ReceiptText size={22} />
          </span>
          <div>
            <strong>{creditor}</strong>
            <span>Your account summary</span>
          </div>
        </div>
        <div className="balance-label">Outstanding balance</div>
        <div className="balance-value">
          {view.account.balance_usd === null
            ? "Unavailable"
            : money(view.account.balance_usd)}
          <span>USD</span>
        </div>
        <dl className="account-details">
          <div>
            <dt>Account reference</dt>
            <dd>{view.consumer_id}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span
                className={`account-status ${accountStatus === "Plan active" ? "updated" : ""}`}
              >
                <span />
                {accountStatus}
              </span>
            </dd>
          </div>
          {summaryPlan && (
            <div>
              <dt>First payment</dt>
              <dd>{date(summaryPlan.first_payment_date)}</dd>
            </div>
          )}
          {summaryPlan?.last_payment_date && (
            <div>
              <dt>Scheduled completion</dt>
              <dd>{date(summaryPlan.last_payment_date)}</dd>
            </div>
          )}
        </dl>
        <details className="account-disclosure">
          <summary>
            About this account <ChevronRight size={14} />
          </summary>
          <p>
            {view.portal.creditor_display_name}. All account details and
            approved-plan examples are synthetic. No production authentication
            is implemented.
          </p>
        </details>
      </aside>
      <section
        className="portal-main"
        aria-label="Your next step"
        aria-busy={busy}
      >
        {step !== "choices" &&
          !(view.confirmed_plan && step !== "help") &&
          !(paymentPending && step !== "help") && (
            <Button
              className="back-button"
              size="sm"
              variant="ghost"
              isDisabled={busy}
              onPress={() => {
                if (review) setReview(null);
                else setStep("choices");
                setConsent(false);
                setValidation("");
              }}
            >
              <ArrowLeft size={16} />
              {review ? "Back to plans" : "Back to your account"}
            </Button>
          )}
        {view.confirmed_plan && step !== "help" ? (
          <div className="active-plan">
            <div className="portal-heading">
              <span className="plan-active-label">
                <CheckCircle2 size={15} />
                Plan active
              </span>
              <h1>Your payment plan</h1>
              <p>
                {view.confirmed_plan.instalments}{" "}
                {view.confirmed_plan.label.toLowerCase()} payments of{" "}
                {money(view.confirmed_plan.instalment_usd)}.
              </p>
            </div>
            <div className="next-payment">
              <span>First scheduled payment</span>
              <strong>{money(view.confirmed_plan.instalment_usd)}</strong>
              <span>{date(view.confirmed_plan.first_payment_date)}</span>
            </div>
            {view.confirmed_plan.payment_schedule && (
              <details className="payment-schedule">
                <summary>
                  View payment schedule <ChevronRight size={16} />
                </summary>
                <ol>
                  {view.confirmed_plan.payment_schedule.map(
                    (payment, index) => (
                      <li key={payment.date}>
                        <span>
                          <span className="schedule-index">{index + 1}</span>
                          {date(payment.date)}
                        </span>
                        <strong>{money(payment.amount_usd)}</strong>
                      </li>
                    ),
                  )}
                </ol>
              </details>
            )}
            <div className="plan-help">
              <span>Need to change something?</span>
              <Button
                variant="outline"
                isDisabled={busy}
                onPress={() => void choose("request_help")}
              >
                Get help with your plan <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        ) : paymentPending && step !== "help" ? (
          <div className="pending-payment">
            <span className="completion-icon">
              <Clock3 size={28} />
            </span>
            <h1>Your payment is processing</h1>
            <p className="lead">
              {view.payment
                ? money(view.payment.amount_usd) + " is pending. "
                : ""}
              You don’t need to make another payment while we check this.
            </p>
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => void choose("request_help")}
            >
              Ask about this payment <ArrowRight size={16} />
            </Button>
            <p className="boundary-note">Demo only. No funds have moved.</p>
          </div>
        ) : (
          <>
            {step === "choices" && (
              <>
                <div className="portal-heading">
                  <h1>Your account</h1>
                  <p>Let’s work out a payment option that suits you.</p>
                </div>
                <h2 className="section-label">Payment options</h2>
                <div className="payment-choices">
                  {paymentChoices.map(
                    ({ intent, title, description, icon: Icon }) => (
                      <Button
                        key={intent}
                        variant="ghost"
                        className={`payment-choice ${intent === "explore_plan" ? "primary-choice" : ""}`}
                        isDisabled={busy || blocked}
                        onPress={() => void choose(intent)}
                      >
                        <span className="choice-icon">
                          <Icon size={21} strokeWidth={1.7} />
                        </span>
                        <span className="choice-copy">
                          <strong>
                            {intent === "explore_plan" && incompletePlan
                              ? "Finish setting up your payment plan"
                              : title}
                          </strong>
                          <span>
                            {intent === "explore_plan" && incompletePlan
                              ? "Review the available options, then confirm"
                              : description}
                          </span>
                        </span>
                        <ChevronRight size={19} />
                      </Button>
                    ),
                  )}
                </div>
                <h2 className="section-label help-heading">Need a hand?</h2>
                <div className="support-choices">
                  <Button
                    variant="ghost"
                    isDisabled={busy}
                    onPress={() => void choose("balance_question")}
                  >
                    <CircleHelp size={19} />
                    <span>Question about my account</span>
                    <ChevronRight size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    isDisabled={busy}
                    onPress={() => void choose("affordability_concern")}
                  >
                    <HeartHandshake size={19} />
                    <span>I’m finding it difficult to pay</span>
                    <ChevronRight size={17} />
                  </Button>
                </div>
                <Button
                  className="later-button"
                  variant="ghost"
                  isDisabled={busy}
                  onPress={() => void choose("review_later")}
                >
                  I’ll review this later <ArrowRight size={15} />
                </Button>
              </>
            )}
            {step === "plans" && (
              <>
                <div className="portal-heading">
                  <h1>
                    {review
                      ? "Review your plan"
                      : matches.length
                        ? "Choose your payment plan"
                        : "No matching plans"}
                  </h1>
                  <p>
                    {review
                      ? "Check the details before you confirm."
                      : matches.length
                        ? "Pick an option to see the dates and confirm the details."
                        : "Try different preferences, or ask us for help."}
                  </p>
                </div>
                {review ? (
                  <div className="plan-review">
                    <div className="review-plan-title">
                      <span>{review.option.label}</span>
                      <strong>
                        {money(review.option.instalment_usd)}
                        <small> / payment</small>
                      </strong>
                    </div>
                    <dl className="review-details">
                      <div>
                        <dt>Frequency</dt>
                        <dd>{humanise(review.option.frequency)}</dd>
                      </div>
                      <div>
                        <dt>Number of payments</dt>
                        <dd>{review.option.instalments}</dd>
                      </div>
                      <div>
                        <dt>First payment</dt>
                        <dd>{date(review.option.first_payment_date)}</dd>
                      </div>
                      {review.option.last_payment_date && (
                        <div>
                          <dt>Scheduled completion</dt>
                          <dd>{date(review.option.last_payment_date)}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Total repayment</dt>
                        <dd>{money(review.option.total_usd)}</dd>
                      </div>
                    </dl>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        I’ve reviewed these terms and choose to confirm this
                        simulated plan.
                      </span>
                    </label>
                    {review.token !== view.portal.review_token && (
                      <p className="inline-error" role="alert">
                        Your options changed. Review the available plans again.
                      </p>
                    )}
                    <Button
                      className="full-action"
                      isDisabled={
                        busy ||
                        !consent ||
                        blocked ||
                        review.token !== view.portal.review_token
                      }
                      onPress={() =>
                        void act({
                          type: "confirm_plan",
                          option_id: review.option.id,
                          confirmed: true,
                          review_token: review.token,
                        })
                      }
                    >
                      Confirm simulated plan <Check size={17} />
                    </Button>
                    <p className="form-note">No payment will be taken.</p>
                    <Button
                      variant="ghost"
                      className="change-option"
                      isDisabled={busy}
                      onPress={() => {
                        setReview(null);
                        setConsent(false);
                      }}
                    >
                      Choose a different plan
                    </Button>
                  </div>
                ) : (
                  <>
                    <details
                      className="plan-preferences"
                      open={preferencesOpen}
                      onToggle={(e) => setPreferencesOpen(e.currentTarget.open)}
                    >
                      <summary>
                        Prefer a different date or amount?{" "}
                        <CalendarDays size={16} />
                      </summary>{" "}
                      <form
                        className="preferences-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void match();
                        }}
                      >
                        <label>
                          Next payday<span className="optional">Optional</span>
                          <input
                            type="date"
                            value={payday}
                            min={view.now_utc.slice(0, 10)}
                            onChange={(e) => setPayday(e.target.value)}
                          />
                        </label>
                        <label>
                          Payment frequency
                          <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                          >
                            <option value="any">No preference</option>
                            <option value="weekly">Weekly</option>
                            <option value="fortnightly">Fortnightly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </label>
                        <label>
                          Maximum per payment
                          <span className="optional">Optional · USD</span>
                          <div className="amount-input">
                            <span>$</span>
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                            />
                          </div>
                        </label>
                        {validation && (
                          <p className="inline-error" role="alert">
                            {validation}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="full-action"
                          isDisabled={busy}
                        >
                          Find matching plans <ArrowRight size={17} />
                        </Button>
                        <p className="form-note">
                          Preferences filter existing plans. They don’t change
                          the terms or assess affordability.
                        </p>
                      </form>
                    </details>
                    <div className="plan-list">
                      {(showAll ? view.portal.options : matches).map(
                        (option) => (
                          <div
                            className={`plan-option ${!option.matches ? "no-match" : ""}`}
                            key={option.id}
                          >
                            <div className="plan-option-top">
                              <span className="plan-frequency">
                                {option.label}
                              </span>
                              {option.matches && (
                                <span className="plan-match">
                                  <Check size={13} />
                                  Available
                                </span>
                              )}
                            </div>
                            <h3>
                              {money(option.instalment_usd)}
                              <span> / payment</span>
                            </h3>
                            <p>
                              {option.instalments} payments · Starts{" "}
                              {date(option.first_payment_date)}
                              {option.last_payment_date && (
                                <span className="plan-end-date">
                                  Finishes {date(option.last_payment_date)}
                                </span>
                              )}
                            </p>
                            <div className="plan-option-bottom">
                              <span>Total {money(option.total_usd)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                isDisabled={busy || !option.matches || blocked}
                                onPress={() => {
                                  setReview({
                                    option,
                                    token: view.portal.review_token,
                                  });
                                  setConsent(false);
                                }}
                              >
                                Review plan <ArrowRight size={15} />
                              </Button>
                            </div>
                            {!option.matches && (
                              <p className="inline-error">
                                {option.reason_codes.map(humanise).join(" · ")}
                              </p>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                    {matches.length === 0 && (
                      <div className="plan-actions">
                        <Button
                          variant="secondary"
                          isDisabled={busy}
                          onPress={() => setPreferencesOpen(true)}
                        >
                          Change preferences
                        </Button>
                        <Button
                          isDisabled={busy}
                          onPress={() => void choose("request_help")}
                        >
                          Ask us for help <ArrowRight size={16} />
                        </Button>
                      </div>
                    )}
                    {matches.length < view.portal.options.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="non-matches"
                        onPress={() => setShowAll(!showAll)}
                      >
                        {showAll
                          ? "Hide other plans"
                          : "Why don’t the other plans match?"}
                      </Button>
                    )}
                    <details className="matching-details">
                      <summary>How matching works</summary>
                      <p>{view.portal.matching_rule}</p>
                      <p>{view.portal.fixture_source}</p>
                    </details>
                  </>
                )}
              </>
            )}
            {step === "help" && (
              <>
                <div className="portal-heading">
                  <h1>
                    {view.confirmed_plan
                      ? "Help with your payment plan"
                      : paymentPending
                        ? "Ask about your payment"
                        : view.intent === "balance_question"
                          ? "Question about your account"
                          : "Get support with payments"}
                  </h1>
                  <p>
                    {view.confirmed_plan
                      ? "Ask our team to review your plan."
                      : paymentPending
                        ? "Our team can check the status for you."
                        : view.intent === "balance_question"
                          ? "Our team can help check the creditor or balance."
                          : "If the available options don’t work for you, we can help."}
                  </p>
                </div>
                <div className="help-panel">
                  {latestHelp ? (
                    <div className="request-success">
                      <CheckCircle2 size={21} />
                      <div>
                        <strong>Request logged</strong>
                        <p>Your reference is {latestHelp.id}.</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="full-action"
                      isDisabled={busy}
                      onPress={() => void act({ type: "request_help" })}
                    >
                      {view.confirmed_plan
                        ? "Request a plan review"
                        : "Send help request"}{" "}
                      <ArrowRight size={17} />
                    </Button>
                  )}
                  <p className="form-note">
                    Weekday business hours. An immediate reply isn’t guaranteed.
                  </p>
                </div>
              </>
            )}
            {step === "payment" && (
              <>
                <div className="portal-heading">
                  <h1>Make a one-off payment</h1>
                  <p>Choose how much you’d like to pay.</p>
                </div>
                <form
                  className="preferences-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = Number(paymentAmount);
                    if (
                      !Number.isFinite(n) ||
                      n <= 0 ||
                      n > (view.account.balance_usd ?? 0)
                    ) {
                      setValidation(
                        "Enter an amount above $0 and no more than your balance.",
                      );
                      return;
                    }
                    void act({
                      type: "simulate_payment",
                      amount_usd: n,
                      confirmed: true,
                    });
                  }}
                >
                  <label>
                    Payment amount<span className="optional">USD</span>
                    <div className="amount-input">
                      <span>$</span>
                      <input
                        required
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        max={view.account.balance_usd ?? 0}
                        step="0.01"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                  </label>
                  {validation && (
                    <p className="inline-error" role="alert">
                      {validation}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="full-action"
                    isDisabled={busy || blocked}
                  >
                    Confirm simulated payment <ArrowRight size={17} />
                  </Button>
                  <p className="boundary-note">
                    <Info size={16} />
                    Demo only. No funds move and no card details are required.
                  </p>
                </form>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
