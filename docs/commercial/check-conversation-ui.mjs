// Compare the actual UI calculation with the independently reproduced Python cases.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateConversation, defaults } from "../../apps/web/src/components/conversation-economics-calculation.ts";

const saved = JSON.parse(readFileSync(new URL("conversation-scenarios.json", import.meta.url), "utf8"));
const csv = readFileSync(new URL("../../brief/03_historical_cohorts.csv", import.meta.url), "utf8").trim().split(/\r?\n/);
const [header, ...lines] = csv;
const keys = header.split(",");
const cohorts = lines.map((line) => Object.fromEntries(line.split(",").map((cell, index) => [keys[index], cell]))).map((row) => ({
  cohort_id: row.cohort_id, consumers: Number(row.consumers), paid_30d: Number(row.paid_30d), cash_collected_30d_usd: Number(row.cash_collected_30d_usd),
}));
const data = { assumptions: { population: 18000, cohort_mix: { C2: 10000, C3: 6000, C4: 2000 }, cash_multiplier: 1, investment: 50000 }, cohorts };
for (const expected of saved.scenarios) {
  const actual = calculateConversation(data, defaults, expected.lift_pp);
  for (const [ui, canonical] of [["reachable", "reachable"], ["responders", "responders"], ["payers", "additional_payers"], ["cash", "additional_cash_usd"], ["contribution", "contribution_per_intake_usd"], ["annual", "annual_contribution_usd"]]) {
    assert.ok(Math.abs(actual[ui] - expected[canonical]) < 1e-8, `${ui} differs at lift ${expected.lift_pp}`);
  }
  assert.equal(actual.payback === null, expected.payback_monthly_intakes === null);
  if (actual.payback !== null) assert.ok(Math.abs(actual.payback - expected.payback_monthly_intakes) < 1e-8);
}
assert.equal(calculateConversation(data, { ...defaults, response: 0 }).cash, 0);
assert.equal(calculateConversation(data, { ...defaults, smsReach: 0 }).payback, null);
const capped = calculateConversation(data, defaults, 100);
assert.ok(capped.payers <= capped.responders);
console.log("Actual UI conversational calculations match independently reproduced scenarios; zero reach/response and conversion cap passed");
