defmodule RecoveryApi.Economics do
  @moduledoc "Reach-adjusted sensitivity from supplied cohorts. No causal uplift is assumed as fact."
  alias RecoveryApi.Fixtures

  @defaults %{
    "population" => 18000,
    "reach_pct" => 60,
    "lift_pp" => 3,
    "support_pct" => 2,
    "email_delta" => 0,
    "sms_delta" => 0,
    "composer_attempts" => 0,
    "investment" => 50000,
    "target_payback_months" => 4,
    "months" => 12,
    "cash_multiplier" => 1,
    "cohort_mix" => %{"C2" => 10000, "C3" => 6000, "C4" => 2000}
  }
  def defaults, do: @defaults

  def calculate(input \\ %{})

  def calculate(input) when is_map(input) do
    assumptions = Map.merge(@defaults, input)

    if Enum.all?(Map.keys(input), &Map.has_key?(@defaults, &1)) && valid?(assumptions) do
      cohorts = Fixtures.cohorts()
      engaged = Enum.filter(cohorts, &(&1["cohort_id"] in ~w(C2 C3 C4)))
      result = compute(engaged, assumptions)

      {:ok,
       %{
         "assumptions" => assumptions,
         "baseline" => %{
           "all_consumers" => 100_000,
           "all_cash_usd" => sum(cohorts, "cash_collected_30d_usd"),
           "engaged_consumers" => sum(engaged, "consumers"),
           "engaged_paid" => sum(engaged, "paid_30d"),
           "engaged_cash_usd" => sum(engaged, "cash_collected_30d_usd"),
           "engaged_contribution_usd" => 106_600
         },
         "cohorts" => cohorts,
         "result" => result,
         "target_solve" => solve_payback(engaged, assumptions),
         "sensitivity" =>
           Enum.map([1, 3, 5, 10], fn lift ->
             Map.put(compute(engaged, Map.put(assumptions, "lift_pp", lift)), "lift_pp", lift)
           end)
       }}
    else
      {:error, "invalid_economic_assumptions"}
    end
  end

  def calculate(_), do: {:error, "invalid_economic_assumptions"}

  defp solve_payback(cohorts, a) do
    required = a["investment"] / a["target_payback_months"]
    maximum = compute(cohorts, Map.put(a, "lift_pp", 100))
    feasible = maximum["monthly_contribution_usd"] >= required

    lift =
      if feasible do
        {_, high} =
          Enum.reduce(1..60, {0.0, 100.0}, fn _, {low, high} ->
            mid = (low + high) / 2
            result = compute(cohorts, Map.put(a, "lift_pp", mid))

            if result["monthly_contribution_usd"] >= required,
              do: {low, mid},
              else: {mid, high}
          end)

        if compute(cohorts, Map.put(a, "lift_pp", 0))["monthly_contribution_usd"] >= required,
          do: 0.0,
          else: high
      end

    result = if feasible, do: compute(cohorts, Map.put(a, "lift_pp", lift))
    within_horizon = a["target_payback_months"] <= a["months"]

    %{
      "target_payback_months" => a["target_payback_months"],
      "required_monthly_contribution_usd" => required,
      "feasible" => feasible,
      "required_lift_pp" => lift,
      "required_additional_payers" => if(result, do: result["additional_payers"]),
      "required_additional_cash_usd" => if(result, do: result["additional_cash_usd"]),
      "max_monthly_contribution_usd" => maximum["monthly_contribution_usd"],
      "target_within_horizon" => within_horizon,
      "reason_codes" =>
        if(feasible,
          do: [],
          else: ["target_unreachable_under_current_assumptions_and_conversion_caps"]
        ) ++
          if(within_horizon, do: [], else: ["target_exceeds_modelled_horizon"])
    }
  end

  defp compute(cohorts, a) do
    population = a["population"]
    reach = population * a["reach_pct"] / 100
    weight_sum = a["cohort_mix"] |> Map.values() |> Enum.sum()

    cash =
      Enum.reduce(cohorts, 0, fn row, acc ->
        weight = a["cohort_mix"][row["cohort_id"]] / weight_sum
        payer_cash = row["cash_collected_30d_usd"] / row["paid_30d"] * a["cash_multiplier"]
        effective_lift = min(a["lift_pp"] / 100, 1 - row["paid_30d"] / row["consumers"])
        acc + reach * weight * effective_lift * payer_cash
      end)

    payers =
      Enum.reduce(cohorts, 0, fn row, acc ->
        acc +
          reach * a["cohort_mix"][row["cohort_id"]] / weight_sum *
            min(a["lift_pp"] / 100, 1 - row["paid_30d"] / row["consumers"])
      end)

    support = reach * a["support_pct"] / 100 * 6
    communication = reach * (a["email_delta"] * 0.003 + a["sms_delta"] * 0.035)
    model = reach * a["composer_attempts"] * 0.012
    contribution = cash * 0.13 - support - communication - model
    horizon = contribution * a["months"]
    payback = if contribution > 0, do: a["investment"] / contribution, else: nil

    %{
      "reached_consumers" => reach,
      "additional_payers" => payers,
      "additional_cash_usd" => cash,
      "retained_revenue_usd" => cash * 0.15,
      "payment_cost_usd" => cash * 0.02,
      "support_cost_usd" => support,
      "communication_cost_usd" => communication,
      "model_cost_usd" => model,
      "monthly_contribution_usd" => contribution,
      "horizon_contribution_usd" => horizon,
      "net_investment_return_usd" => horizon - a["investment"],
      "payback_months" => payback,
      "payback_within_horizon" => is_number(payback) && payback <= a["months"]
    }
  end

  defp valid?(a) do
    checks = [
      {"population", 1, 1_000_000},
      {"reach_pct", 0, 100},
      {"lift_pp", 0, 100},
      {"support_pct", 0, 100},
      {"email_delta", -5, 5},
      {"sms_delta", -5, 5},
      {"composer_attempts", 0, 10},
      {"investment", 0, 1_000_000},
      {"target_payback_months", 1, 36},
      {"months", 1, 36},
      {"cash_multiplier", 0, 3}
    ]

    Enum.all?(checks, fn {key, low, high} ->
      is_number(a[key]) && a[key] >= low && a[key] <= high
    end) &&
      is_map(a["cohort_mix"]) && Enum.sort(Map.keys(a["cohort_mix"])) == ~w(C2 C3 C4) &&
      Enum.all?(Map.values(a["cohort_mix"]), &(is_number(&1) && &1 >= 0)) &&
      Enum.sum(Map.values(a["cohort_mix"])) > 0
  end

  defp sum(rows, key), do: Enum.reduce(rows, 0, &(&1[key] + &2))
end
