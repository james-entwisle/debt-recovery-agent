import type { Economics } from "@/lib/api";

export type Inputs = {
  smsReach: number;
  response: number;
  lift: number;
  turns: number;
  turnCost: number;
  sends: number;
  escalations: number;
  savings: number;
};

export const defaults: Inputs = {
  smsReach: 60,
  response: 30,
  lift: 3,
  turns: 4,
  turnCost: 0.01,
  sends: 4,
  escalations: 2,
  savings: 0,
};

function cohortWeight(id: string, mix: Economics["assumptions"]["cohort_mix"]) {
  switch (id) {
    case "C2": return mix.C2;
    case "C3": return mix.C3;
    case "C4": return mix.C4;
    default: return 0;
  }
}

export function calculateConversation(data: Economics, inputs: Inputs, lift = inputs.lift) {
  const assumptions = data.assumptions;
  const totalWeight = assumptions.cohort_mix.C2 + assumptions.cohort_mix.C3 + assumptions.cohort_mix.C4;
  const reachable = assumptions.population * inputs.smsReach / 100;
  const responders = reachable * inputs.response / 100;
  let payers = 0;
  let cash = 0;
  for (const cohort of data.cohorts) {
    const weight = cohortWeight(cohort.cohort_id, assumptions.cohort_mix);
    const share = totalWeight > 0 ? weight / totalWeight : 0;
    const baselineRate = cohort.consumers > 0 ? cohort.paid_30d / cohort.consumers : 0;
    const added = responders * share * Math.min(lift / 100, 1 - baselineRate);
    payers += added;
    cash += added * (cohort.paid_30d > 0 ? cohort.cash_collected_30d_usd / cohort.paid_30d : 0) * assumptions.cash_multiplier;
  }
  const fees = cash * 0.15;
  const payment = cash * 0.02;
  const sms = responders * inputs.sends * 0.035;
  const ai = responders * inputs.turns * inputs.turnCost;
  const support = responders * inputs.escalations / 100 * 6;
  const supportSavings = responders * inputs.savings / 100 * 6;
  const contribution = fees - payment - sms - ai - support + supportSavings;
  return { reachable, responders, payers, cash, fees, payment, sms, ai, support, supportSavings,
    contribution, annual: contribution * 12, payback: contribution > 0 ? assumptions.investment / contribution : null };
}

