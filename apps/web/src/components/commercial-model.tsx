"use client";
import { useEffect, useState } from "react";
import { ConversationEconomics } from "./conversation-economics";
import { Button } from "@heroui/react";
import { ArrowRight, ArrowUpRight, Check, Info, RefreshCw } from "lucide-react";
import {
  request,
  economicsSchema,
  money,
  number,
  type Assumptions,
  type Economics,
} from "@/lib/api";

function roundedMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CommercialModel() {
  const [data, setData] = useState<Economics | null>(null);
  const [inputs, setInputs] = useState<Assumptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    request("/economics", economicsSchema)
      .then((value) => {
        if (live) {
          setData(value);
          setInputs(value.assumptions);
        }
      })
      .catch((e) => {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "Could not load the financial model.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  async function calculate(next = inputs) {
    if (!next) return;
    setBusy(true);
    setError("");
    try {
      setData(await request("/economics", economicsSchema, next));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not calculate this scenario.",
      );
    } finally {
      setBusy(false);
    }
  }
  function update(key: keyof Omit<Assumptions, "cohort_mix">, value: number) {
    setInputs((current) => (current ? { ...current, [key]: value } : current));
  }
  if (!data || !inputs)
    return (
      <div className="empty-state" role="status">
        {error || "Loading financial model…"}
        {error && (
          <Button variant="outline" onPress={() => window.location.reload()}>
            Retry
          </Button>
        )}
      </div>
    );
  const r = data.result;
  const target = data.target_solve;
  const changed = JSON.stringify(inputs) !== JSON.stringify(data.assumptions);
  const low = data.sensitivity.find((row) => row.lift_pp === 1);
  const high = data.sensitivity.find((row) => row.lift_pp === 5);
  const horizon = data.assumptions.months;
  const horizonLabel =
    horizon === 12
      ? "Annual contribution"
      : `Contribution over ${number(horizon)} months`;
  return (
    <div className="financial-model">
      <header className="financial-heading">
        <div>
          <h1>Financial model</h1>
          <p>Illustrative scenarios, not a forecast.</p>
        </div>
        <span className="model-source">Synthetic case study · USD</span>
      </header>
      <div className="financial-workspace">
        <form
          className="model-inputs"
          onSubmit={(e) => {
            e.preventDefault();
            void calculate();
          }}
        >
          <div className="model-section-heading">
            <h2>Your assumptions</h2>
            <span>Monthly audience</span>
          </div>
          <label>
            Engaged consumers
            <input
              type="number"
              min="1"
              max="1000000"
              required
              value={inputs.population}
              onChange={(e) => update("population", Number(e.target.value))}
            />
          </label>
          <label>
            <span className="slider-label">
              Effective reach<strong>{number(inputs.reach_pct)}%</strong>
            </span>
            <input
              aria-label="Effective reach"
              type="range"
              min="0"
              max="100"
              value={inputs.reach_pct}
              onChange={(e) => update("reach_pct", Number(e.target.value))}
            />
            <span className="field-help">
              Share reached after eligibility and exposure limits
            </span>
          </label>
          <label>
            <span className="slider-label">
              Payment-rate improvement
              <strong>+{number(inputs.lift_pp)} pp</strong>
            </span>
            <input
              aria-label="Payment-rate improvement"
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={inputs.lift_pp}
              onChange={(e) => update("lift_pp", Number(e.target.value))}
            />
            <span className="field-help">
              Percentage points among reached consumers
            </span>
          </label>
          <label>
            Upfront investment
            <span className="input-currency">
              <span>$</span>
              <input
                aria-label="Upfront investment"
                type="number"
                min="0"
                max="1000000"
                required
                value={inputs.investment}
                onChange={(e) => update("investment", Number(e.target.value))}
              />
            </span>
          </label>
          <Button type="submit" className="full-action" isDisabled={busy}>
            {busy ? "Calculating…" : "Update scenario"}
            {busy ? <RefreshCw size={15} /> : <ArrowRight size={16} />}
          </Button>
          <details className="advanced-assumptions">
            <summary>Advanced assumptions</summary>
            <div className="advanced-fields">
              <label>
                Extra support conversations (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={inputs.support_pct}
                  onChange={(e) =>
                    update("support_pct", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Cash per extra payer multiplier
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.1"
                  value={inputs.cash_multiplier}
                  onChange={(e) =>
                    update("cash_multiplier", Number(e.target.value))
                  }
                />
                <span className="field-help">
                  1× uses historical cash per payer. Extra payers may pay less.
                </span>
              </label>
              <label>
                Months to model
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={inputs.months}
                  onChange={(e) => update("months", Number(e.target.value))}
                />
              </label>
              <label>
                Net extra emails per person reached
                <input
                  type="number"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={inputs.email_delta}
                  onChange={(e) =>
                    update("email_delta", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Net extra SMS per person reached
                <input
                  type="number"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={inputs.sms_delta}
                  onChange={(e) => update("sms_delta", Number(e.target.value))}
                />
              </label>
              <label>
                Model attempts per person reached
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={inputs.composer_attempts}
                  onChange={(e) =>
                    update("composer_attempts", Number(e.target.value))
                  }
                />
              </label>
              <p className="field-help">
                A replacement on the same channel costs no more. Negative
                contact changes represent avoided sends.
              </p>
              <div className="cohort-weights">
                <span>Cohort mix weights</span>
                {(
                  ["C2", "C3", "C4"] satisfies Array<
                    keyof Assumptions["cohort_mix"]
                  >
                ).map((key) => (
                  <label key={key}>
                    {
                      {
                        C2: "Clicked link",
                        C3: "Portal visit",
                        C4: "Incomplete plan",
                      }[key]
                    }
                    <input
                      type="number"
                      min="0"
                      value={inputs.cohort_mix[key]}
                      onChange={(e) =>
                        setInputs({
                          ...inputs,
                          cohort_mix: {
                            ...inputs.cohort_mix,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                type="submit"
                isDisabled={busy}
              >
                Apply assumptions <ArrowRight size={15} />
              </Button>
            </div>
          </details>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <section
          className={`model-results ${changed ? "pending-results" : ""}`}
          aria-label="Calculated scenario"
          aria-busy={busy}
        >
          <div className="result-status" role="status">
            {changed ? (
              <>
                <Info size={14} />
                Inputs changed. Update to recalculate.
              </>
            ) : (
              <>
                <span className="scenario-dot" />
                Selected scenario · +{number(data.assumptions.lift_pp)} pp
                improvement
              </>
            )}
          </div>
          <div className="outcome-pair">
            <div>
              <span>Investment payback</span>
              <strong>
                {r.payback_months === null
                  ? "No payback"
                  : number(r.payback_months)}
                {r.payback_months !== null && <small> months</small>}
              </strong>
              <p>
                {r.payback_months !== null && !r.payback_within_horizon
                  ? "Beyond modelled duration"
                  : "Operating months after launch"}
              </p>
            </div>
            <div>
              <span>{horizonLabel}</span>
              <strong>{roundedMoney(r.horizon_contribution_usd)}</strong>
              <p>After running costs, before the build</p>
            </div>
          </div>
          <div className="net-return">
            <span>
              After {roundedMoney(data.assumptions.investment)} upfront
              investment
            </span>
            <strong>{roundedMoney(r.net_investment_return_usd)}</strong>
          </div>
          {low && high && (
            <div className="compact-range">
              <span>+1 to +5 pp scenarios</span>
              <strong>
                {roundedMoney(low.horizon_contribution_usd)} to{" "}
                {roundedMoney(high.horizon_contribution_usd)}
              </strong>
              <p>
                {horizon === 12
                  ? "Annual contribution"
                  : "Contribution over " + number(horizon) + " months"}
                , before the build. Scenario range, not a confidence interval.
              </p>
            </div>
          )}
          <div className="target-planner">
            <div className="target-heading">
              <h2>Plan around a payback goal</h2>
              <ArrowUpRight size={19} />
            </div>
            <div className="target-control">
              <label htmlFor="payback-target">Target after launch</label>
              <div>
                <input
                  id="payback-target"
                  type="number"
                  min="1"
                  max="36"
                  value={inputs.target_payback_months}
                  onChange={(e) =>
                    update("target_payback_months", Number(e.target.value))
                  }
                />
                <span>months</span>
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={busy}
                  onPress={() => void calculate()}
                >
                  Calculate
                </Button>
              </div>
            </div>
            {target.feasible &&
            target.required_lift_pp !== null &&
            target.required_additional_payers !== null &&
            target.required_additional_cash_usd !== null ? (
              <>
                <div className="target-answer">
                  <span>Required payment-rate improvement</span>
                  <strong>+{number(target.required_lift_pp)} pp</strong>
                </div>
                <p className="target-detail">
                  About {number(Math.ceil(target.required_additional_payers))}{" "}
                  extra payers and{" "}
                  {roundedMoney(target.required_additional_cash_usd)} extra
                  collections each month to contribute{" "}
                  {roundedMoney(target.required_monthly_contribution_usd)}.
                </p>
                {target.required_lift_pp > 5 && (
                  <p className="target-warning">
                    Above the illustrative +1 to +5 pp range.
                  </p>
                )}
              </>
            ) : (
              <p className="target-warning">
                This target cannot be reached with the current audience, reach
                and cash assumptions.
              </p>
            )}
            {!target.target_within_horizon && (
              <p className="target-warning">
                The target extends beyond the assumed months of sustained
                effect.
              </p>
            )}
            <p className="target-footnote">
              A planning requirement, not a prediction. Excludes build time and
              ramp-up.
            </p>
          </div>
        </section>
      </div>
      <section className="value-bridge" aria-label="Monthly value calculation">
        <div className="model-section-heading">
          <h2>How the monthly value adds up</h2>
          <span>{changed ? "Previous calculation" : "Selected scenario"}</span>
        </div>
        <ol>
          {[
            {
              label: "Engaged consumers",
              value: number(data.assumptions.population),
            },
            { label: "Consumers reached", value: number(r.reached_consumers) },
            { label: "Extra payers", value: number(r.additional_payers) },
            {
              label: "Extra collections",
              value: roundedMoney(r.additional_cash_usd),
            },
            {
              label: "After running costs",
              value: roundedMoney(r.monthly_contribution_usd),
            },
          ].map((item, index) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {index < 4 && <ArrowRight size={16} />}
            </li>
          ))}
        </ol>
        <details className="cost-breakdown">
          <summary>See the revenue and cost breakdown</summary>
          <dl className="ledger">
            <div>
              <dt>Additional settled collections</dt>
              <dd>{money(r.additional_cash_usd)}</dd>
            </div>
            <div>
              <dt>Retained revenue · 15%</dt>
              <dd>{money(r.retained_revenue_usd)}</dd>
            </div>
            <div>
              <dt>Payment processing · 2% of collections</dt>
              <dd>{money(r.payment_cost_usd)}</dd>
            </div>
            <div>
              <dt>Extra support · $6 per conversation</dt>
              <dd>{money(r.support_cost_usd)}</dd>
            </div>
            <div>
              <dt>Net communication costs</dt>
              <dd>{money(r.communication_cost_usd)}</dd>
            </div>
            <div>
              <dt>Model attempts · $0.012 each</dt>
              <dd>{money(r.model_cost_usd)}</dd>
            </div>
            <div className="ledger-total">
              <dt>Monthly contribution after costs</dt>
              <dd>{money(r.monthly_contribution_usd)}</dd>
            </div>
          </dl>
        </details>
      </section>
      <section className="scenario-section">
        <div className="model-section-heading">
          <h2>Compare the possibilities</h2>
          <span>Same audience, reach and costs</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Payment-rate improvement</th>
                <th>Extra monthly collections</th>
                <th>{horizonLabel}</th>
                <th>Payback after launch</th>
                <th>
                  <span className="sr-only">Select scenario</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sensitivity.map((row) => (
                <tr
                  key={row.lift_pp}
                  className={
                    row.lift_pp === data.assumptions.lift_pp
                      ? "selected-scenario"
                      : ""
                  }
                >
                  <td>
                    <strong>+{row.lift_pp} pp</strong>
                    {row.lift_pp === 10 && (
                      <span className="stretch-label">Speculative</span>
                    )}
                  </td>
                  <td>{roundedMoney(row.additional_cash_usd)}</td>
                  <td>{roundedMoney(row.horizon_contribution_usd)}</td>
                  <td>
                    {row.payback_months === null
                      ? "No payback"
                      : number(row.payback_months) + " months"}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      isDisabled={busy}
                      aria-label={`Use ${row.lift_pp} percentage point scenario`}
                      onPress={() => {
                        const next = { ...inputs, lift_pp: row.lift_pp };
                        setInputs(next);
                        void calculate(next);
                      }}
                    >
                      {row.lift_pp === data.assumptions.lift_pp ? (
                        <Check size={16} />
                      ) : (
                        <ArrowRight size={16} />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="scenario-note">
          Zero lift is possible. Use 0 pp to see the cost of no improvement.
          These scenarios assume new, non-overlapping monthly audiences and a
          constant effect.
        </p>
      </section>
      <ConversationEconomics data={data} />
      <details className="historical-context">
        <summary>Historical baseline and model limits</summary>
        <div className="details-body">
          <p>
            The engaged cohorts already collect{" "}
            {roundedMoney(data.baseline.engaged_cash_usd)} per monthly audience
            without this intervention. That is baseline cash, not additional
            value.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cohort</th>
                  <th>Consumers</th>
                  <th>30-day payers</th>
                  <th>Settled collections</th>
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((row) => (
                  <tr key={row.cohort_id}>
                    <td>{row.signal.replaceAll("_", " ")}</td>
                    <td>{number(row.consumers)}</td>
                    <td>{number(row.paid_30d)}</td>
                    <td>{roundedMoney(row.cash_collected_30d_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Historical cohorts are not a conversion funnel or causal evidence.
            Additional payers may settle less than historical payers. Earlier
            cash may be acceleration rather than higher long-term recovery. The
            proposed investment gate is payback within 12 months at validated
            scale; the editable planning goal is separate.
          </p>
        </div>
      </details>
    </div>
  );
}
