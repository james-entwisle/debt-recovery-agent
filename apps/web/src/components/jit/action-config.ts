import type { JitState } from "@/lib/api";

export const jitActionTitles = {
  account: "Review your account",
  options: "Set up a payment plan",
  payday: "Set up a payment plan",
  draft: "Set up a payment plan",
  review: "Set up a payment plan",
  resume: "Finish setting up your plan",
  active_plan: "Your payment plan",
  change_date: "Change your payment date",
  change_frequency: "Change payment frequency",
  payment: "Make a one-off payment",
  early_payoff: "Pay off your balance",
  clarification: "Ask about your account",
  help: "Request assistance",
  pending: "Payment status",
} satisfies Record<JitState, string>;

export const libraryTasks = [
  {
    id: "plan",
    label: "Set up a payment plan",
    state: "options",
    fixture: "fresh",
  },
  {
    id: "resume",
    label: "Resume a saved plan",
    state: "resume",
    fixture: "draft",
  },
  {
    id: "payoff",
    label: "Pay off your balance",
    state: "early_payoff",
    fixture: "payment",
  },
  {
    id: "frequency",
    label: "Change payment frequency",
    state: "change_frequency",
    fixture: "plan",
  },
  {
    id: "method",
    label: "Update payment method",
    state: null,
    fixture: "plan",
  },
  {
    id: "date",
    label: "Change payment date",
    state: "change_date",
    fixture: "plan",
  },
  {
    id: "help",
    label: "Request assistance",
    state: "help",
    fixture: "none",
  },
] as const;

export type LibraryTaskId = (typeof libraryTasks)[number]["id"];
export type LibraryTask = (typeof libraryTasks)[number];

export function libraryTaskForState(state: JitState): LibraryTaskId | null {
  if (state === "payday" || state === "draft" || state === "review")
    return "plan";
  if (state === "active_plan") return "method";
  return libraryTasks.find((task) => task.state === state)?.id ?? null;
}

export function isPlanSetup(state: JitState) {
  return ["options", "payday", "draft", "review", "resume"].includes(state);
}