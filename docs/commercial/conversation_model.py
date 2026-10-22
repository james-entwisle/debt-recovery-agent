"""Reproduce the separate V2 conversational sensitivity. Standard library only."""
import csv
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def calculate(rows, inputs, lift=None):
    values = list(inputs.values())
    if not all(isinstance(v, (float, int)) and math.isfinite(v) and v >= 0 for v in values):
        raise ValueError("Conversation assumptions must be finite and non-negative")
    for name in ("sms_reachable_pct", "response_pct", "responder_lift_pp"):
        if inputs[name] > 100:
            raise ValueError(f"{name} exceeds 100")
    lift = inputs["responder_lift_pp"] if lift is None else lift
    engaged = [row for row in rows if row["cohort_id"] in {"C2", "C3", "C4"}]
    population = sum(int(row["consumers"]) for row in engaged)
    reachable = population * inputs["sms_reachable_pct"] / 100
    responders = reachable * inputs["response_pct"] / 100
    payers = 0
    cash = 0
    for row in engaged:
        count, paid = int(row["consumers"]), int(row["paid_30d"])
        added = responders * count / population * min(lift / 100, 1 - paid / count)
        payers += added
        cash += added * float(row["cash_collected_30d_usd"]) / paid * inputs["payer_cash_multiplier"]
    fees = cash * .15
    payment = cash * .02
    sms = responders * inputs["net_extra_sms_per_responder"] * .035
    ai = responders * inputs["ai_turns_per_responder"] * inputs["hypothetical_ai_turn_cost_usd"]
    support = responders * inputs["extra_support_conversations_per_100_responders"] / 100 * 6
    savings = responders * inputs["avoided_support_conversations_per_100_responders"] / 100 * 6
    contribution = fees - payment - sms - ai - support + savings
    return dict(lift_pp=lift, engaged=population, reachable=reachable, responders=responders,
                additional_payers=payers, additional_cash_usd=cash, fees_usd=fees,
                payment_cost_usd=payment, sms_cost_usd=sms, ai_cost_usd=ai,
                extra_support_cost_usd=support, support_savings_usd=savings,
                contribution_per_intake_usd=contribution,
                annual_contribution_usd=contribution * inputs["new_equivalent_intakes"],
                payback_monthly_intakes=inputs["investment_usd"] / contribution if contribution > 0 else None)


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    inputs = json.loads((HERE / "conversation-assumptions.json").read_text())
    with (ROOT / "brief/03_historical_cohorts.csv").open() as stream:
        rows = list(csv.DictReader(stream))
    cases = [calculate(rows, inputs, lift) for lift in [0, 1, 3, 5, 10]]
    reference = cases[2]
    assert reference["engaged"] == 18000
    assert reference["responders"] == 3240
    assert math.isclose(reference["additional_cash_usd"], 17064)
    assert math.isclose(reference["contribution_per_intake_usd"], 1246.32)
    assert math.isclose(reference["annual_contribution_usd"], 14955.84)
    assert math.isclose(cases[0]["annual_contribution_usd"], -11664)
    assert calculate(rows, {**inputs, "response_pct": 0})["payback_monthly_intakes"] is None
    assert calculate(rows, {**inputs, "sms_reachable_pct": 0})["additional_cash_usd"] == 0
    capped = calculate(rows, {**inputs, "responder_lift_pp": 100})
    assert capped["additional_payers"] <= capped["responders"]
    for invalid in [float("nan"), float("inf"), -1]:
        try:
            calculate(rows, {**inputs, "hypothetical_ai_turn_cost_usd": invalid})
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid cost accepted")
    result = json.dumps({"assumptions": inputs, "scenarios": cases}, indent=2) + "\n"
    output = HERE / "conversation-scenarios.json"
    if args.check:
        if not output.exists() or output.read_text() != result:
            raise SystemExit("Conversational outputs are stale; regenerate with conversation_model.py")
        print("Conversational model: arithmetic, zero reach/response, conversion cap and saved output checks passed")
    else:
        output.write_text(result)
        print(output)


if __name__ == "__main__":
    main()
