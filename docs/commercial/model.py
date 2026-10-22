"""Reproduce the synthetic case economics. Python 3.9+, standard library only."""
import argparse
import copy
import csv
import hashlib
import io
import json
import math
from pathlib import Path
from statistics import NormalDist

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SOURCE = ROOT / "brief/03_historical_cohorts.csv"
COHORT_IDS = ("C2", "C3", "C4")


def load_history():
    with SOURCE.open(newline="", encoding="utf-8") as stream:
        raw = list(csv.DictReader(stream))
    required = {"C0", "C1", *COHORT_IDS}
    if len(raw) != 5 or {r["cohort_id"] for r in raw} != required:
        raise ValueError("Expected five unique historical cohorts C0-C4")
    rows = {}
    for record in raw:
        if record["synthetic"] != "true" or any(v == "" for v in record.values()):
            raise ValueError("Expected complete synthetic records")
        row = {k: int(v) for k, v in record.items()
               if k not in ("cohort_id", "signal", "synthetic")}
        n = row["consumers"]
        if n <= 0 or any(v < 0 for v in row.values()):
            raise ValueError("Invalid historical count")
        for key in ("paid_7d", "paid_30d", "plan_confirmed_30d",
                    "opted_out_30d", "complained_30d"):
            if row[key] > n:
                raise ValueError("Outcome count exceeds cohort")
        both = row["paid_and_plan_30d"]
        union = row["paid_30d"] + row["plan_confirmed_30d"] - both
        if both > min(row["paid_30d"], row["plan_confirmed_30d"]) or union > n:
            raise ValueError("Invalid payment-plan overlap")
        if row["paid_7d"] > row["paid_30d"]:
            raise ValueError("Seven-day payments exceed 30-day payments")
        rows[record["cohort_id"]] = dict(row, signal=record["signal"])
    return rows


def validate(a):
    mappings = ("cohort_weights", "effective_reach_by_cohort")
    for name in mappings:
        if set(a[name]) != set(COHORT_IDS):
            raise ValueError(f"{name} must contain C2, C3, C4")
    numbers = [v for k, v in a.items() if k not in mappings
               and not isinstance(v, list)]
    numbers += list(a["cohort_weights"].values())
    numbers += list(a["effective_reach_by_cohort"].values())
    numbers += a["lift_scenarios_pp"] + a["lift_persistence_by_intake"]
    if any(not isinstance(v, (int, float)) or isinstance(v, bool)
           or not math.isfinite(v) or v < 0 for v in numbers):
        raise ValueError("Assumptions must be finite non-negative numbers")
    if sum(a["cohort_weights"].values()) <= 0:
        raise ValueError("Cohort weights must have a positive sum")
    if any(v > 1 for v in a["effective_reach_by_cohort"].values()):
        raise ValueError("Reach must be between zero and one")
    if len(a["lift_persistence_by_intake"]) != 12:
        raise ValueError("Annual model requires twelve equivalent 30-day intakes")
    if any(v > 1 for v in a["lift_persistence_by_intake"]):
        raise ValueError("Persistence weights must be between zero and one")
    if max(a["retained_fee_rate"], a["payment_cost_rate"]) > 1:
        raise ValueError("Fee and payment cost rates must not exceed one")
    if a["payment_cost_rate"] >= a["retained_fee_rate"]:
        raise ValueError("Retained fee must exceed payment cost")
    if not a["lift_scenarios_pp"]:
        raise ValueError("At least one lift scenario is required")
    if any(v > 100 for v in a["lift_scenarios_pp"]):
        raise ValueError("Percentage-point lift must not exceed 100")


def calculate(history, a, lift_pp):
    validate(a)
    if not math.isfinite(lift_pp) or not 0 <= lift_pp <= 100:
        raise ValueError("Lift must be 0-100 percentage points")
    weight_sum = sum(a["cohort_weights"].values())
    reached = additional_payers = additional_cash = 0.0
    for cid in COHORT_IDS:
        row = history[cid]
        population = a["monthly_engaged_consumers"] * a["cohort_weights"][cid] / weight_sum
        exposure = population * a["effective_reach_by_cohort"][cid]
        lift = min(lift_pp / 100, 1 - row["paid_30d"] / row["consumers"])
        payer_cash = row["cash_collected_30d_usd"] / row["paid_30d"]
        reached += exposure
        additional_payers += exposure * lift
        additional_cash += exposure * lift * payer_cash * a["incremental_payer_cash_multiplier"]
    added_channel = reached * (a["added_emails_per_reached"] * a["email_cost_usd"]
                              + a["added_sms_per_reached"] * a["sms_cost_usd"])
    replaced_channel = reached * (a["replaced_emails_per_reached"] * a["email_cost_usd"]
                                 + a["replaced_sms_per_reached"] * a["sms_cost_usd"])
    communication = added_channel - replaced_channel
    attempts = reached * a["composer_attempts_per_reached"]
    model_cost = attempts * a["composer_attempt_cost_usd"]
    conversations = reached * a["added_support_conversations_per_reached"]
    support = conversations * a["support_conversation_cost_usd"]
    recurring = communication + model_cost + support + a["other_recurring_cost_per_intake_usd"]
    revenue = additional_cash * a["retained_fee_rate"]
    payment = additional_cash * a["payment_cost_rate"]
    gross_contribution = revenue - payment
    monthly = gross_contribution - recurring
    contributions = [gross_contribution * w - recurring for w in a["lift_persistence_by_intake"]]
    annual = sum(contributions)
    cumulative = 0.0
    payback = None
    if a["investment_usd"] == 0:
        payback = 0.0
    else:
        for index, contribution in enumerate(contributions):
            before = cumulative
            cumulative += contribution
            if payback is None and contribution > 0 and cumulative >= a["investment_usd"]:
                payback = index + (a["investment_usd"] - before) / contribution
    simple = a["investment_usd"] / monthly if monthly > 0 else None
    return {
        "lift_among_reached_pp": lift_pp,
        "engaged_consumers_per_intake": a["monthly_engaged_consumers"],
        "effective_reached_consumers": reached,
        "effective_reach_pct": 100 * reached / a["monthly_engaged_consumers"] if a["monthly_engaged_consumers"] else 0,
        "paid_lift_all_assigned_pp": 100 * additional_payers / a["monthly_engaged_consumers"] if a["monthly_engaged_consumers"] else 0,
        "additional_payers_per_intake": additional_payers,
        "additional_settled_cash_per_intake_usd": additional_cash,
        "retained_revenue_per_intake_usd": revenue,
        "payment_cost_per_intake_usd": payment,
        "gross_contribution_per_intake_usd": gross_contribution,
        "added_communication_cost_per_intake_usd": added_channel,
        "replaced_communication_cost_per_intake_usd": replaced_channel,
        "net_communication_cost_per_intake_usd": communication,
        "composer_attempts_per_intake": attempts,
        "composer_cost_per_intake_usd": model_cost,
        "added_support_conversations_per_intake": conversations,
        "support_cost_per_intake_usd": support,
        "other_recurring_cost_per_intake_usd": a["other_recurring_cost_per_intake_usd"],
        "steady_contribution_per_intake_usd": monthly,
        "annual_contribution_usd": annual,
        "annual_net_after_investment_usd": annual - a["investment_usd"],
        "simple_run_rate_payback_months": simple,
        "payback_within_modelled_year_months": payback,
    }


def historical_table(history):
    result = []
    for cid, row in history.items():
        n = row["consumers"]
        union = row["paid_30d"] + row["plan_confirmed_30d"] - row["paid_and_plan_30d"]
        result.append(dict(cohort_id=cid, consumers=n, paid_30d=row["paid_30d"],
                           paid_30d_pct=100 * row["paid_30d"] / n,
                           paid_or_plan_30d=union, paid_or_plan_30d_pct=100 * union / n,
                           cash_30d_usd=row["cash_collected_30d_usd"],
                           cash_per_payer_usd=row["cash_collected_30d_usd"] / row["paid_30d"],
                           opt_out_pct=100 * row["opted_out_30d"] / n,
                           complaint_pct=100 * row["complained_30d"] / n))
    return result


def sample_size(history, a, lift_pp=3):
    """Approximate two-proportion planning, 80% power, two-sided 5% alpha."""
    weight_sum = sum(a["cohort_weights"].values())
    p0 = sum(a["cohort_weights"][c] * history[c]["paid_30d"] / history[c]["consumers"]
             for c in COHORT_IDS) / weight_sum
    delta = calculate(history, a, lift_pp)["paid_lift_all_assigned_pp"] / 100
    if delta <= 0:
        return None
    p1 = p0 + delta
    average = (p0 + p1) / 2
    z_alpha = NormalDist().inv_cdf(0.975)
    z_power = NormalDist().inv_cdf(0.8)
    per_arm = ((z_alpha * math.sqrt(2 * average * (1 - average))
                + z_power * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) / delta) ** 2
    return 2 * math.ceil(per_arm)


def sensitivity_cases(a):
    cases = [("reference", {})]
    cases += [("double_recurring_volume_constant_lift_and_linear_costs", {"monthly_engaged_consumers": a["monthly_engaged_consumers"] * 2}),
              ("30pct_reach", {"effective_reach_by_cohort": dict.fromkeys(COHORT_IDS, 0.3)}),
              ("5pct_support", {"added_support_conversations_per_reached": 0.05}),
              ("half_incremental_payer_cash", {"incremental_payer_cash_multiplier": 0.5}),
              ("lift_fades_after_six_intakes_costs_continue", {"lift_persistence_by_intake": [1] * 6 + [0] * 6}),
              ("one_extra_sms_no_replacement", {"added_sms_per_reached": 1}),
              ("additional_2000_ongoing_cost", {"other_recurring_cost_per_intake_usd": 2000}),
              ("no_lift", {"lift_scenarios_pp": [0]})]
    return [(name, dict(copy.deepcopy(a), **changes)) for name, changes in cases]


def verify(history, a):
    # A fixed reference case keeps checks meaningful when editable inputs change.
    a = dict(a, monthly_engaged_consumers=18000,
             cohort_weights={"C2": 10000, "C3": 6000, "C4": 2000},
             effective_reach_by_cohort=dict.fromkeys(COHORT_IDS, 0.6),
             lift_scenarios_pp=[1, 3, 5, 10], incremental_payer_cash_multiplier=1,
             retained_fee_rate=0.15, payment_cost_rate=0.02,
             email_cost_usd=0.003, sms_cost_usd=0.035,
             composer_attempt_cost_usd=0.012, support_conversation_cost_usd=6,
             added_emails_per_reached=1, replaced_emails_per_reached=1,
             added_sms_per_reached=0, replaced_sms_per_reached=0,
             composer_attempts_per_reached=0,
             added_support_conversations_per_reached=0.02,
             other_recurring_cost_per_intake_usd=0, investment_usd=50000,
             lift_persistence_by_intake=[1] * 12)
    assert sum(r["consumers"] for r in history.values()) == 100000
    assert sum(r["cash_collected_30d_usd"] for r in history.values()) == 1780000
    assert sum(history[c]["consumers"] for c in COHORT_IDS) == 18000
    assert sum(history[c]["paid_30d"] for c in COHORT_IDS) == 4600
    assert sum(history[c]["cash_collected_30d_usd"] for c in COHORT_IDS) == 820000
    full = copy.deepcopy(a)
    full["effective_reach_by_cohort"] = dict.fromkeys(COHORT_IDS, 1)
    # Reconciliation deliberately uses source arithmetic, separate from calculate().
    one_point_cash = sum(history[c]["consumers"] * 0.01 * history[c]["cash_collected_30d_usd"]
                         / history[c]["paid_30d"] for c in COHORT_IDS)
    assert math.isclose(one_point_cash, 31600)
    assert math.isclose(calculate(history, full, 1)["additional_settled_cash_per_intake_usd"], one_point_cash)
    base = calculate(history, a, 3)
    assert math.isclose(base["annual_contribution_usd"], 73180.8)
    assert math.isclose(base["support_cost_per_intake_usd"], 1296)
    zero = copy.deepcopy(a)
    zero["effective_reach_by_cohort"] = dict.fromkeys(COHORT_IDS, 0)
    assert calculate(history, zero, 3)["annual_contribution_usd"] == 0
    assert calculate(history, zero, 3)["payback_within_modelled_year_months"] is None
    assert calculate(history, a, 0)["annual_contribution_usd"] == -15552
    assert math.isclose(calculate(history, full, 100)["additional_payers_per_intake"], 13400)
    for name, changed in sensitivity_cases(a):
        result = calculate(history, changed, 0 if name == "no_lift" else 3)
        if name == "lift_fades_after_six_intakes_costs_continue":
            assert math.isclose(result["annual_contribution_usd"], 28814.4)
            assert result["payback_within_modelled_year_months"] is None
    invalid = copy.deepcopy(a)
    invalid["effective_reach_by_cohort"]["C2"] = float("nan")
    try:
        calculate(history, invalid, 3)
    except ValueError:
        pass
    else:
        raise AssertionError("Non-finite reach accepted")


def as_csv(records):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(records[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows({k: round(v, 6) if isinstance(v, float) else v for k, v in r.items()} for r in records)
    return stream.getvalue()


def build_outputs(history, a):
    scenarios = [calculate(history, a, lift) for lift in a["lift_scenarios_pp"]]
    sensitivity = [dict(case=name, **calculate(history, changed, 0 if name == "no_lift" else 3))
                   for name, changed in sensitivity_cases(a)]
    evidence = {
        "source": "brief/03_historical_cohorts.csv",
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "all_consumers": sum(r["consumers"] for r in history.values()),
        "all_settled_cash_usd": sum(r["cash_collected_30d_usd"] for r in history.values()),
        "engaged_consumers": sum(history[c]["consumers"] for c in COHORT_IDS),
        "engaged_paid": sum(history[c]["paid_30d"] for c in COHORT_IDS),
        "engaged_settled_cash_usd": sum(history[c]["cash_collected_30d_usd"] for c in COHORT_IDS),
        "approx_total_sample_for_3pp_reached_lift": sample_size(history, a),
    }
    return {"historical.csv": as_csv(historical_table(history)),
            "scenarios.csv": as_csv(scenarios), "sensitivity.csv": as_csv(sensitivity),
            "evidence.json": json.dumps(evidence, indent=2) + "\n"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assumptions", type=Path, default=HERE / "assumptions.json")
    parser.add_argument("--output-dir", type=Path, default=HERE)
    parser.add_argument("--check", action="store_true", help="Check committed default outputs without writing")
    args = parser.parse_args()
    history = load_history()
    assumptions = json.loads(args.assumptions.read_text())
    if args.check:
        if args.assumptions.resolve() != (HERE / "assumptions.json").resolve():
            parser.error("--check verifies the committed default assumptions only")
        verify(history, assumptions)
    outputs = build_outputs(history, assumptions)
    if not args.check:
        args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, content in outputs.items():
        path = args.output_dir / name
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f"Stale output: {path}. Run python3 docs/commercial/model.py")
        else:
            path.write_text(content)
    print("Commercial model: checks passed" if args.check else "Commercial model: outputs regenerated")
    sample = sample_size(history, assumptions)
    print(f"3pp reached-lift planning sample, total: {sample:,}" if sample is not None
          else "Planning sample unavailable at zero reach or zero population")


if __name__ == "__main__":
    main()
