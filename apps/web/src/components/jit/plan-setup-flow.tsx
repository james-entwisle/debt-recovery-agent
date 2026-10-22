"use client";
import { useState } from "react";
import { Button } from "@heroui/react";
import { ArrowRight, Check, ChevronDown, FileCheck2, Save } from "lucide-react";
import {
  date,
  dateTime,
  humanise,
  money,
  type DraftStep,
  type JitState,
  type SessionView,
} from "@/lib/api";
import type { Act } from "../resolution-app";
import {
  ActionFooter,
  ActionHeader,
  ActionResult,
  MethodPicker,
  ScheduleSummary,
} from "./action-parts";

const steps: DraftStep[] = ["options", "schedule", "method", "review"];
const labels = {
  options: "Choose a plan",
  schedule: "Review the schedule",
  method: "Choose a payment method",
  review: "Review and confirm",
} satisfies Record<DraftStep, string>;

export function PlanSetupFlow({
  state,
  view,
  act,
  busy,
  onLeave,
  onTask,
}: {
  state: JitState;
  view: SessionView;
  act: Act;
  busy: boolean;
  onLeave: () => void;
  onTask: (state: JitState) => void;
}) {
  const [step, setStep] = useState<DraftStep>("options");
  const [selected, setSelected] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [frequency, setFrequency] = useState(
    view.preferences.frequency ?? "any",
  );
  const [payday, setPayday] = useState(view.preferences.payday ?? "");
  const [amount, setAmount] = useState(
    view.preferences.max_instalment_usd?.toString() ?? "",
  );
  const [validation, setValidation] = useState("");
  const option = view.portal.options.find((o) => o.id === selected);
  const matches = view.portal.options.filter((o) => o.matches);
  const method = view.portal.payment_methods.find(
    (m) => m.id === methodId && m.eligible,
  );
  const draft = view.conversation.draft;
  const stepIndex = steps.indexOf(step);

  async function match() {
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      setValidation("Enter an amount above $0, or leave it blank.");
      return;
    }
    if (payday && payday < view.now_utc.slice(0, 10)) {
      setValidation("Choose today or a later date.");
      return;
    }
    const preferences = {
      frequency,
      ...(payday ? { payday } : {}),
      ...(amount ? { max_instalment_usd: Number(amount) } : {}),
    };
    if (await act({ type: "match_preferences", preferences })) {
      setSelected(null);
      setConsent(false);
      setValidation("");
    }
  }
  async function save() {
    if (!option?.matches) return;
    if (
      await act({
        type: "save_draft",
        option_id: option.id,
        step,
        ...(methodId ? { payment_method_id: methodId } : {}),
      })
    )
      setSaved(true);
  }
  function back() {
    const previous = steps[stepIndex - 1];
    if (previous) {
      setStep(previous);
      setConsent(false);
    }
  }

  if (state === "resume" && !resumed)
    return (
      <>
        <ActionHeader
          title="Resume your saved plan"
          description="Your choices are saved. Review them before confirming."
        />
        {draft ? (
          <>
            <div className="jit-draft-card">
              <FileCheck2 size={24} />
              <div>
                <strong>
                  {["saved", "resumed"].includes(draft.status)
                    ? "Saved progress"
                    : "Draft unavailable"}
                </strong>
                <span>
                  Saved {dateTime(draft.updated_at_utc ?? draft.saved_at_utc)}
                </span>
              </div>
            </div>
            {["saved", "resumed"].includes(draft.status) ? (
              <>
                <dl className="jit-key-values">
                  <div>
                    <dt>Return to</dt>
                    <dd>{labels[draft.step]}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>{dateTime(draft.expires_at_utc)}</dd>
                  </div>
                </dl>
                <ActionFooter onCancel={onLeave} busy={busy}>
                  <Button
                    className="full-action"
                    isDisabled={busy}
                    onPress={async () => {
                      if (await act({ type: "resume_draft" })) {
                        setSelected(draft.option_id);
                        setMethodId(draft.payment_method_id);
                        setStep(draft.step);
                        setConsent(false);
                        setResumed(true);
                      }
                    }}
                  >
                    Continue setup <ArrowRight size={16} />
                  </Button>
                </ActionFooter>
              </>
            ) : (
              <>
                <p className="jit-helper">
                  This draft expired or its terms are no longer available. No
                  agreement was created.
                </p>
                <ActionFooter onCancel={onLeave}>
                  <Button
                    className="full-action"
                    onPress={() => onTask("options")}
                  >
                    Review current options <ArrowRight size={16} />
                  </Button>
                </ActionFooter>
              </>
            )}
          </>
        ) : (
          <>
            <p className="jit-helper">
              There isn’t a saved draft for this account yet.
            </p>
            <ActionFooter onCancel={onLeave}>
              <Button className="full-action" onPress={() => onTask("options")}>
                Set up a payment plan <ArrowRight size={16} />
              </Button>
            </ActionFooter>
          </>
        )}
      </>
    );

  if (view.confirmed_plan && state !== "resume")
    return (
      <ActionResult
        title="Your plan is active"
        description={`${view.confirmed_plan.instalments} ${view.confirmed_plan.frequency} payments of ${money(view.confirmed_plan.instalment_usd)}. No funds have been taken.`}
        onDone={onLeave}
      >
        <dl className="jit-key-values">
          <div>
            <dt>Next scheduled payment</dt>
            <dd>{date(view.confirmed_plan.first_payment_date)}</dd>
          </div>
          <div>
            <dt>Scheduled completion</dt>
            <dd>{date(view.confirmed_plan.last_payment_date)}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>
              {view.confirmed_plan.payment_method_label ??
                "Payment method on file"}
            </dd>
          </div>
        </dl>
        <details className="jit-result-details">
          <summary>View plan details</summary>
          <ScheduleSummary option={view.confirmed_plan} />
        </details>
      </ActionResult>
    );

  if (saved && draft && ["saved", "resumed"].includes(draft.status))
    return (
      <ActionResult
        title="Saved for later"
        description="Your progress is saved. This is an unconfirmed draft, not a payment agreement."
        onDone={onLeave}
      >
        <dl className="jit-key-values">
          <div>
            <dt>Saved step</dt>
            <dd>{labels[draft.step]}</dd>
          </div>
          <div>
            <dt>Return before</dt>
            <dd>{dateTime(draft.expires_at_utc)}</dd>
          </div>
        </dl>
        <Button
          variant="outline"
          className="full-action"
          isDisabled={busy}
          onPress={() => setSaved(false)}
        >
          Keep editing
        </Button>
      </ActionResult>
    );

  if (!view.portal.can_confirm)
    return (
      <>
        <ActionHeader
          title="This plan can’t be set up right now"
          description="The latest account state needs a different next step."
        />
        <ActionFooter onCancel={onLeave}>
          <Button className="full-action" onPress={() => onTask("help")}>
            Ask for assistance <ArrowRight size={16} />
          </Button>
        </ActionFooter>
      </>
    );

  return (
    <>
      <div className="jit-progress" aria-label={`Step ${stepIndex + 1} of 4`}>
        {steps.map((value, index) => (
          <span key={value} className={index <= stepIndex ? "reached" : ""} />
        ))}
      </div>
      <ActionHeader
        step={`Step ${stepIndex + 1} of 4`}
        title={labels[step]}
        description={
          step === "options"
            ? "Select an existing approved option. You’ll confirm at the end."
            : undefined
        }
        onBack={stepIndex > 0 ? back : undefined}
      />
      {step === "options" && (
        <>
          <details
            className="jit-compact-preferences"
            open={state === "payday" || undefined}
          >
            <summary>
              Match date or amount preferences <ChevronDown size={15} />
            </summary>
            <div className="jit-form-fields">
              <label>
                Payment frequency
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  disabled={busy}
                >
                  <option value="any">No preference</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label>
                Next payday <span>Optional</span>
                <input
                  type="date"
                  min={view.now_utc.slice(0, 10)}
                  value={payday}
                  onChange={(e) => setPayday(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label>
                Maximum per payment, USD <span>Optional</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="No preference"
                  disabled={busy}
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                isDisabled={busy}
                onPress={() => void match()}
              >
                Check matching options
              </Button>
            </div>
          </details>
          {validation && (
            <p role="alert" className="field-error">
              {validation}
            </p>
          )}
          <fieldset className="jit-option-list">
            <legend className="sr-only">Approved repayment options</legend>
            {matches.map((candidate) => (
              <label
                className={`jit-choice-row ${selected === candidate.id ? "selected" : ""}`}
                key={candidate.id}
              >
                <input
                  type="radio"
                  name="approved-plan"
                  value={candidate.id}
                  checked={selected === candidate.id}
                  disabled={busy}
                  onChange={() => {
                    setSelected(candidate.id);
                    setConsent(false);
                  }}
                />
                <span>
                  <strong>
                    {money(candidate.instalment_usd)}{" "}
                    <small>{humanise(candidate.frequency).toLowerCase()}</small>
                  </strong>
                  <span>
                    {candidate.instalments} payments · starts{" "}
                    {date(candidate.first_payment_date)}
                  </span>
                  <small>Total {money(candidate.total_usd)}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {matches.length === 0 && (
            <div className="jit-empty-options">
              <h3>No approved plan matches</h3>
              <p>Try other preferences, or ask our team for help.</p>
              <Button variant="outline" onPress={() => onTask("help")}>
                Request assistance
              </Button>
            </div>
          )}
          <p className="jit-helper">
            Fixed synthetic options for this demonstration.
          </p>
        </>
      )}
      {step === "schedule" && option && (
        <>
          <div className="jit-selected-plan">
            <span>{option.label} plan</span>
            <strong>
              {money(option.instalment_usd)}
              <small> per payment</small>
            </strong>
            <p>
              {option.instalments} payments · {money(option.total_usd)} total
            </p>
          </div>
          <ScheduleSummary option={option} />
        </>
      )}
      {step === "method" && (
        <MethodPicker
          methods={view.portal.payment_methods}
          selected={methodId}
          onSelect={setMethodId}
          onAdd={() => act({ type: "add_demo_payment_method" })}
          busy={busy}
        />
      )}
      {step === "review" && option && (
        <>
          <dl className="jit-key-values">
            <div>
              <dt>Creditor</dt>
              <dd>
                {view.portal.creditor_display_name.replace(
                  /\s*\(synthetic\)/i,
                  "",
                )}
              </dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{view.consumer_id}</dd>
            </div>
            <div>
              <dt>Outstanding balance</dt>
              <dd>{money(view.account.balance_usd ?? option.total_usd)}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {money(option.instalment_usd)} {option.frequency}
              </dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>
                {method
                  ? method.label
                  : "Select a method"}
              </dd>
            </div>
          </dl>
          <ScheduleSummary option={option} />
          <div className="jit-authorisation-note">
            Payment authorisation placeholder · simulation only
          </div>
          <label className="jit-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={busy}
            />
            <span>
              I’ve reviewed this plan and choose to confirm it in the
              simulation. No real debit is authorised.
            </span>
          </label>
        </>
      )}
      <ActionFooter onCancel={onLeave} busy={busy}>
        {step !== "review" ? (
          <Button
            className="full-action"
            isDisabled={
              busy || !option?.matches || (step === "method" && !method)
            }
            onPress={() => {
              const next = steps[stepIndex + 1];
              if (next) setStep(next);
            }}
          >
            Continue <ArrowRight size={16} />
          </Button>
        ) : (
          <Button
            className="full-action"
            isDisabled={busy || !consent || !option?.matches || !method}
            onPress={() => {
              if (option && method)
                void act({
                  type: "confirm_plan",
                  option_id: option.id,
                  confirmed: true,
                  review_token: view.portal.review_token,
                  payment_method_id: method.id,
                });
            }}
          >
            Confirm simulated plan <Check size={16} />
          </Button>
        )}
        <Button
          variant="outline"
          className="full-action"
          isDisabled={busy || !option?.matches}
          onPress={() => void save()}
        >
          <Save size={15} />
          Save and finish later
        </Button>
      </ActionFooter>
    </>
  );
}
