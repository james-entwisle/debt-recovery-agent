import { z } from "zod";

const contactSchema = z.object({
  contact_id: z.string(),
  channel: z.string(),
  scheduled_at_utc: z.string(),
  template_id: z.string(),
  status: z.string().optional(),
  pilot: z.boolean().optional(),
});
const optionSchema = z.object({
  id: z.string(),
  label: z.string(),
  frequency: z.string(),
  first_payment_date: z.string(),
  last_payment_date: z.string(),
  payment_schedule: z.array(
    z.object({ date: z.string(), amount_usd: z.number() }),
  ),
  instalment_usd: z.number(),
  instalments: z.number(),
  total_usd: z.number(),
  matches: z.boolean(),
  reason_codes: z.array(z.string()),
});
export const viewSchema = z.object({
  session_id: z.string(),
  scenario_id: z.string(),
  consumer_id: z.string(),
  now_utc: z.string(),
  initial_time_utc: z.string(),
  revision: z.number(),
  account: z.object({
    balance_usd: z.number().nullable(),
    pilot_scope_allowed: z.boolean().nullable(),
    language: z.string().nullable(),
    timezone: z.string().nullable(),
    email_allowed: z.boolean().nullable(),
    sms_allowed: z.boolean().nullable(),
    payment_status: z.string().nullable(),
    plan_status: z.string().nullable(),
    holds: z.array(z.string()).nullable(),
  }),
  intent: z.string().nullable(),
  preferences: z.object({
    payday: z.string().optional(),
    frequency: z.string().optional(),
    max_instalment_usd: z.number().optional(),
  }),
  events: z.array(
    z.object({
      event_id: z.string(),
      type: z.string(),
      occurred_at_utc: z.string(),
      ingested_at_utc: z.string(),
    }),
  ),
  contacts: z.array(contactSchema),
  original_contacts: z.array(contactSchema),
  contact_history: z.array(
    z.object({
      attempt_id: z.string(),
      channel: z.string(),
      attempted_at_utc: z.string(),
    }),
  ),
  decision: z.object({
    outcome: z.string(),
    reason_codes: z.array(z.string()),
    proposal: contactSchema.nullable(),
    consumer_context: z.string(),
    evaluated_at_utc: z.string(),
    policy_version: z.string(),
    evidence_event_ids: z.array(z.string()),
    eligibility: z.object({
      source_eligible: z.boolean(),
      restriction_reasons: z.array(z.string()),
      local_time: z.string().nullable(),
      in_contact_window: z.boolean(),
      attempts_24h: z.number(),
      attempts_7d: z.number(),
      email_allowed: z.boolean().nullable(),
      sms_allowed: z.boolean().nullable(),
    }),
  }),
  audit: z.array(
    z.object({
      sequence: z.number(),
      at_utc: z.string(),
      event: z.string(),
      details: z.record(z.string(), z.unknown()),
      policy_version: z.string(),
      simulated: z.boolean(),
    }),
  ),
  stopped: z.boolean(),
  portal: z.object({
    creditor_display_name: z.string(),
    fixture_source: z.string(),
    options: z.array(optionSchema),
    can_confirm: z.boolean(),
    review_token: z.string(),
    matching_rule: z.string(),
  }),
  support_requests: z.array(
    z.object({ id: z.string(), message: z.string(), status: z.string() }),
  ),
  confirmed_plan: z
    .object({
      label: z.string(),
      instalment_usd: z.number(),
      instalments: z.number(),
      total_usd: z.number(),
      first_payment_date: z.string(),
      frequency: z.string(),
      last_payment_date: z.string(),
      payment_schedule: z.array(
        z.object({ date: z.string(), amount_usd: z.number() }),
      ),
    })
    .nullable(),
  payment: z.object({ amount_usd: z.number(), status: z.string() }).nullable(),
  experiment: z.object({
    assigned_arm: z.string(),
    preview_arm: z.string(),
    preview_is_counterfactual: z.boolean(),
  }),
  message: z.object({
    subject: z.string(),
    body: z.string(),
    template_id: z.string(),
    disclosure_label: z.string(),
    disclosure_version: z.string(),
    disclosure_text: z.string(),
    approval: z.string(),
    ai_generated: z.boolean(),
  }),
  synthetic: z.boolean(),
});
export type SessionView = z.infer<typeof viewSchema>;
export type PlanOption = z.infer<typeof optionSchema>;
export type Intent =
  | "explore_payment"
  | "explore_plan"
  | "payday_preference"
  | "balance_question"
  | "affordability_concern"
  | "request_help"
  | "review_later";
export type Preferences = {
  payday?: string;
  frequency?: string;
  max_instalment_usd?: number;
};
export type Command =
  | { type: "evaluate" | "schedule" | "request_help" }
  | { type: "advance"; to_utc: string }
  | { type: "record_intent"; intent: Intent }
  | { type: "match_preferences"; preferences: Preferences }
  | {
      type: "confirm_plan";
      option_id: string;
      confirmed: true;
      review_token: string;
    }
  | { type: "simulate_payment"; amount_usd: number; confirmed: true }
  | { type: "set_stop"; stopped: boolean }
  | { type: "handoff"; contact_id: string };
export type Scenario = { id: string; label: string };
const responseSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), view: viewSchema }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

async function requestRaw(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      "The demonstration API is unavailable. Start the Elixir backend and retry.",
    );
  }
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(
      error.success
        ? error.data.error.replaceAll("_", " ")
        : "The API could not complete this request.",
    );
  }
  return data;
}
async function session(path: string, body?: unknown) {
  const result = responseSchema.safeParse(await requestRaw(path, body));
  if (!result.success)
    throw new Error(
      "The API response does not match the shared contract. Check the API version.",
    );
  if (!result.data.ok) throw new Error(result.data.error.replaceAll("_", " "));
  return result.data.view;
}

// All transport and response validation lives here. Components only consume domain views.
export const api = {
  async scenarios(): Promise<Scenario[]> {
    return z
      .object({
        scenarios: z.array(z.object({ id: z.string(), label: z.string() })),
      })
      .parse(await requestRaw("/scenarios")).scenarios;
  },
  open: (scenarioId: string, arm = "treatment") =>
    session("/sessions", { scenario_id: scenarioId, arm }),
  view: (id: string) => session(`/sessions/${encodeURIComponent(id)}`),
  command: (id: string, command: Command) =>
    session(`/sessions/${encodeURIComponent(id)}/commands`, {
      command_id: crypto.randomUUID(),
      command,
    }),
};
export function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
export function humanise(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}
export function dateTime(value: string, timezone: string | null = "UTC") {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone ?? "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}
export function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

const assumptionsSchema = z.object({
  population: z.number(),
  reach_pct: z.number(),
  lift_pp: z.number(),
  support_pct: z.number(),
  email_delta: z.number(),
  sms_delta: z.number(),
  composer_attempts: z.number(),
  investment: z.number(),
  months: z.number(),
  cash_multiplier: z.number(),
  target_payback_months: z.number(),
  cohort_mix: z.object({ C2: z.number(), C3: z.number(), C4: z.number() }),
});
const resultSchema = z.object({
  reached_consumers: z.number(),
  additional_payers: z.number(),
  additional_cash_usd: z.number(),
  retained_revenue_usd: z.number(),
  payment_cost_usd: z.number(),
  support_cost_usd: z.number(),
  communication_cost_usd: z.number(),
  model_cost_usd: z.number(),
  monthly_contribution_usd: z.number(),
  horizon_contribution_usd: z.number(),
  net_investment_return_usd: z.number(),
  payback_months: z.number().nullable(),
  payback_within_horizon: z.boolean(),
});
export const economicsSchema = z.object({
  target_solve: z.object({
    target_payback_months: z.number(),
    required_monthly_contribution_usd: z.number(),
    feasible: z.boolean(),
    required_lift_pp: z.number().nullable(),
    required_additional_payers: z.number().nullable(),
    required_additional_cash_usd: z.number().nullable(),
    max_monthly_contribution_usd: z.number(),
    target_within_horizon: z.boolean(),
    reason_codes: z.array(z.string()),
  }),
  assumptions: assumptionsSchema,
  baseline: z.object({
    all_cash_usd: z.number(),
    engaged_cash_usd: z.number(),
  }),
  result: resultSchema,
  sensitivity: z.array(resultSchema.extend({ lift_pp: z.number() })),
  cohorts: z.array(
    z.object({
      cohort_id: z.string(),
      signal: z.string(),
      consumers: z.number(),
      paid_30d: z.number(),
      cash_collected_30d_usd: z.number(),
    }),
  ),
});
export type Assumptions = z.infer<typeof assumptionsSchema>;
export type Economics = z.infer<typeof economicsSchema>;
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<T> {
  return schema.parse(await requestRaw(path, body));
}
export function number(value: number) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(
    value,
  );
}
