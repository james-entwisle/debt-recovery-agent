import type { JitState } from "@/lib/api";

type Preview = {
  title: string;
  description: string;
  artwork: "options" | "draft" | "date" | "frequency" | "payment" | "payoff" | "account" | "help";
};

const previews = {
  account: { title: "View account details", description: "Sign in to view the details and available next steps.", artwork: "account" },
  options: { title: "Explore payment options", description: "Find an available schedule that works for you.", artwork: "options" },
  payday: { title: "Plan around payday", description: "Review available dates and payment schedules.", artwork: "date" },
  draft: { title: "Continue your plan setup", description: "Return to your saved steps and review before confirming.", artwork: "draft" },
  resume: { title: "Pick up where you left off", description: "Continue your saved setup when you are ready.", artwork: "draft" },
  review: { title: "Review your plan", description: "Check the schedule and terms before you decide.", artwork: "options" },
  payment: { title: "Manage payment method", description: "Securely review or update your payment method.", artwork: "payment" },
  clarification: { title: "Get help with your account", description: "Review the next steps and ask for support.", artwork: "help" },
  help: { title: "Find the right support", description: "Explore support and ask for help with your next step.", artwork: "help" },
  pending: { title: "Check payment status", description: "Sign in to see the latest status before taking action.", artwork: "payment" },
  active_plan: { title: "Manage your plan", description: "Review your schedule and available plan actions.", artwork: "options" },
  change_date: { title: "Request a different date", description: "Review a new date and send a change request.", artwork: "date" },
  change_frequency: { title: "Request a different frequency", description: "Explore a different rhythm for your payments.", artwork: "frequency" },
  early_payoff: { title: "Explore paying in full", description: "Review the details before authorising a payment.", artwork: "payoff" },
} satisfies Record<JitState, Preview>;

export const jitPreviewKinds = Object.keys(previews);

export function jitPreviewFor(state: JitState) {
  const preview = previews[state];
  return { ...preview, image: `/jit-preview/${preview.artwork}.svg`, path: `/jit-preview/${state}` };
}

export function jitPreviewForKind(kind: string) {
  const match = Object.entries(previews).find(([key]) => key === kind);
  if (!match) return null;
  const [key, preview] = match;
  return { ...preview, image: `/jit-preview/${preview.artwork}.svg`, path: `/jit-preview/${key}` };
}
