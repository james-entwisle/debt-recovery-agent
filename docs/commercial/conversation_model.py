"""Reproduce the cohort progression calculator. Python standard library only."""
import argparse
import copy
import csv
import json
import math
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
IDS = ("C2", "C3", "C4")
STAGES = ("portal", "start", "confirm", "pay")


def validate(a):
    if a["audience"] not in {"engaged", *IDS}:
        raise ValueError("Unknown cohort")
    numbers = [v for k, v in a.items() if k not in {"audience", "rates"}]
    if set(a["rates"]) != set(IDS):
        raise ValueError("Three cohort rate tables required")
    for cohort in a["rates"].values():
        if set(cohort) != {"current", "adaptive"}:
            raise ValueError("Current and adaptive rates required")
        for rates in cohort.values():
            if set(rates) != set(STAGES):
                raise ValueError("Four progression stages required")
            numbers.extend(rates.values())
            if any(not isinstance(v, (int, float)) or v > 100 for v in rates.values()):
                raise ValueError("Rates must be percentages")
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0 for v in numbers):
        raise ValueError("Inputs must be finite non-negative numbers")
    if a["reach"] > 100 or a["incrementality"] > 100 or not 1 <= a["months"] <= 36:
        raise ValueError("Percentage or horizon out of range")


def relevant(cid, stage):
    return not (stage == "portal" and cid != "C2") and not (stage == "start" and cid == "C4")


def calculate(source, a):
    validate(a)
    selected = [r for r in source if r["cohort_id"] in IDS and (a["audience"] == "engaged" or r["cohort_id"] == a["audience"])]
    weight = sum(int(row["consumers"]) for row in selected)
    rows = []
    for row in selected:
        cid, n, paid = row["cohort_id"], int(row["consumers"]), int(row["paid_30d"])
        population = a["population"] * n / weight
        reached = population * a["reach"] / 100
        def progress(rates):
            remaining = reached
            counts = {}
            for stage in STAGES:
                remaining *= rates[stage] / 100 if relevant(cid, stage) else 1
                counts[stage] = remaining
            return counts
        current, adaptive = progress(a["rates"][cid]["current"]), progress(a["rates"][cid]["adaptive"])
        raw = (adaptive["pay"] - current["pay"]) * a["incrementality"] / 100
        payers = max(-reached * paid / n, min(raw, reached * (1 - paid / n)))
        cash = payers * float(row["cash_collected_30d_usd"]) / paid * a["cashMultiplier"]
        rows.append(dict(id=cid, population=population, reached=reached, current=current, adaptive=adaptive, payers=payers, cash=cash))
    def total(key):
        return sum(row[key] for row in rows)
    reached, cash = total("reached"), total("cash")
    support, sms, ai = reached * a["support"] / 100 * 6, reached * a["sms"] * .035, reached * a["turns"] * a["turnCost"]
    contribution = cash * .13 - support - sms - ai - a["ongoing"]
    progression = [dict(stage=s, current=sum(r["current"][s] for r in rows), adaptive=sum(r["adaptive"][s] for r in rows)) for s in STAGES]
    return dict(population=total("population"), reached=reached, payers=total("payers"), cash=cash, fees=cash * .15, payment=cash * .02, support=support, sms=sms, ai=ai, contribution=contribution, annual=contribution * 12, horizon=contribution * a["months"], netAfterBuild=contribution * a["months"] - a["investment"], payback=a["investment"] / contribution if contribution > 0 else None, progression=progression, rows=rows)


def no_change(a):
    a = copy.deepcopy(a)
    for cid in IDS:
        a["rates"][cid]["adaptive"] = copy.deepcopy(a["rates"][cid]["current"])
    return a


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--check", action="store_true")
    p.add_argument("--assumptions", type=Path, default=HERE / "conversation-assumptions.json")
    p.add_argument("--output", type=Path, default=HERE / "conversation-scenarios.json")
    args = p.parse_args()
    a = json.loads(args.assumptions.read_text())
    with (ROOT / "brief/03_historical_cohorts.csv").open() as stream:
        source = list(csv.DictReader(stream))
    cases = []
    patches = [("reference", {}), ("click_only", dict(audience="C2", population=10000)), ("portal_no_start", dict(audience="C3", population=6000)), ("incomplete_plan", dict(audience="C4", population=2000)), ("half_incrementality", dict(incrementality=50)), ("half_cash", dict(cashMultiplier=.5)), ("zero_reach", dict(reach=0)), ("ongoing_cost_without_reach", dict(reach=0, ongoing=2000)), ("conversation_costs", dict(sms=1.2, turns=1.2)), ("short_horizon", dict(months=3))]
    for name, patch in patches:
        inputs = {**copy.deepcopy(a), **patch}
        cases.append(dict(name=name, inputs=inputs, result=calculate(source, inputs)))
    cases.append(dict(name="no_improvement", inputs=no_change(a), result=calculate(source, no_change(a))))
    regression = no_change(a)
    regression["rates"]["C2"]["adaptive"]["portal"] = 30
    cases.append(dict(name="worse_progression", inputs=regression, result=calculate(source, regression)))
    if args.check:
        r = cases[0]["result"]
        assert r["population"] == 18000 and r["reached"] == 10800
        assert math.isclose(r["payers"], 324) and math.isclose(r["cash"], 56880)
        assert math.isclose(r["annual"], 73180.8)
        assert math.isclose(cases[-2]["result"]["annual"], -15552)
        assert cases[-1]["result"]["payers"] < 0
        assert cases[6]["result"]["payback"] is None
        for invalid in [float("nan"), float("inf"), -1]:
            try:
                calculate(source, {**a, "turnCost": invalid})
            except ValueError:
                pass
            else:
                raise AssertionError("Invalid input accepted")
    content = json.dumps(dict(assumptions=a, cases=cases), indent=2) + "\n"
    if args.check:
        if args.output.read_text() != content:
            raise SystemExit("Stale output; run conversation_model.py")
        print("Graduation model: calibrated original case, cohort, stage, cost and saved-output checks passed")
    else:
        args.output.write_text(content)
        print(args.output)


if __name__ == "__main__":
    main()
