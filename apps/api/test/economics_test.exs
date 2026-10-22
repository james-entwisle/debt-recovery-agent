defmodule IndebtedApi.EconomicsTest do
  use ExUnit.Case, async: true
  alias IndebtedApi.Economics

  test "supplied baseline and stated base scenario reconcile" do
    {:ok, output} = Economics.calculate()
    assert output["baseline"]["all_cash_usd"] == 1_780_000
    assert output["baseline"]["engaged_cash_usd"] == 820_000
    assert output["baseline"]["engaged_paid"] == 4600
    result = output["result"]
    assert_in_delta result["additional_cash_usd"], 56880, 0.001
    assert_in_delta result["monthly_contribution_usd"], 6098.4, 0.001
    assert_in_delta result["horizon_contribution_usd"], 73180.8, 0.001
    assert_in_delta result["payback_months"], 8.19887, 0.00001
    assert result["payback_within_horizon"]
  end

  test "full reach three point lift produces stated cash and contribution before other costs" do
    {:ok, output} = Economics.calculate(%{"reach_pct" => 100, "support_pct" => 0})
    assert_in_delta output["result"]["additional_cash_usd"], 94800, 0.001
    assert_in_delta output["result"]["monthly_contribution_usd"], 12324, 0.001
  end

  test "replacement savings, draft attempts and support are incremental costs" do
    {:ok, output} =
      Economics.calculate(%{"email_delta" => 1, "sms_delta" => -1, "composer_attempts" => 2})

    result = output["result"]
    assert_in_delta result["communication_cost_usd"], 10800 * (0.003 - 0.035), 0.001
    assert_in_delta result["model_cost_usd"], 10800 * 2 * 0.012, 0.001

    assert_in_delta result["monthly_contribution_usd"],
                    result["additional_cash_usd"] * 0.13 -
                      result["support_cost_usd"] - result["communication_cost_usd"] -
                      result["model_cost_usd"],
                    0.001
  end

  test "zero lift or reach never invents payback or plan revenue" do
    {:ok, zero_lift} = Economics.calculate(%{"lift_pp" => 0})
    assert zero_lift["result"]["additional_cash_usd"] == 0
    assert zero_lift["result"]["payback_months"] == nil
    refute zero_lift["result"]["payback_within_horizon"]
    {:ok, zero_reach} = Economics.calculate(%{"reach_pct" => 0})
    assert zero_reach["result"]["monthly_contribution_usd"] == 0
    assert zero_reach["result"]["payback_months"] == nil
  end

  test "malformed assumptions return a domain error without raising" do
    for input <- [
          nil,
          [],
          %{"population" => "18000"},
          %{"population" => nil},
          %{"reach_pct" => 101},
          %{"cohort_mix" => nil},
          %{"cohort_mix" => []},
          %{"cohort_mix" => %{}},
          %{"cohort_mix" => %{"C2" => 0, "C3" => 0, "C4" => 0}},
          %{"cohort_mix" => %{"C2" => "x", "C3" => 1, "C4" => 1}},
          %{"unknown" => true}
        ] do
      assert {:error, "invalid_economic_assumptions"} = Economics.calculate(input)
    end
  end

  test "four-month target solves the existing cost and cash model and responds to assumptions" do
    {:ok, output} = Economics.calculate()
    target = output["target_solve"]
    assert target["feasible"]
    assert target["target_within_horizon"]
    assert target["target_payback_months"] == 4
    assert_in_delta target["required_monthly_contribution_usd"], 12500, 0.001
    assert_in_delta target["required_lift_pp"], 5.597208698, 0.000001
    assert_in_delta target["required_additional_payers"], 604.49854, 0.00001
    assert_in_delta target["required_additional_cash_usd"], 106_123.076923, 0.00001
    {:ok, replay} = Economics.calculate(%{"lift_pp" => target["required_lift_pp"]})
    assert_in_delta replay["result"]["payback_months"], 4, 0.000001
    {:ok, half_cash} = Economics.calculate(%{"cash_multiplier" => 0.5})
    assert_in_delta half_cash["target_solve"]["required_lift_pp"], 11.194417396, 0.000001
    {:ok, shorter_horizon} = Economics.calculate(%{"months" => 2})
    refute shorter_horizon["target_solve"]["target_within_horizon"]
    assert "target_exceeds_modelled_horizon" in shorter_horizon["target_solve"]["reason_codes"]
    assert {:error, _} = Economics.calculate(%{"target_payback_months" => 0})
  end

  test "target solve respects conversion caps and reports unreachable targets without invented lift" do
    for assumptions <- [
          %{"reach_pct" => 0},
          %{"cash_multiplier" => 0},
          %{"population" => 100, "investment" => 1_000_000}
        ] do
      {:ok, output} = Economics.calculate(assumptions)
      target = output["target_solve"]
      refute target["feasible"]
      assert target["required_lift_pp"] == nil
      assert target["required_additional_payers"] == nil
      assert target["required_additional_cash_usd"] == nil
      assert target["max_monthly_contribution_usd"] < target["required_monthly_contribution_usd"]
    end

    assumptions = %{"population" => 1000, "support_pct" => 0, "reach_pct" => 100}
    {:ok, capped} = Economics.calculate(Map.put(assumptions, "lift_pp", 100))
    investment = capped["result"]["monthly_contribution_usd"] * 4
    {:ok, exact} = Economics.calculate(Map.put(assumptions, "investment", investment))
    target = exact["target_solve"]
    assert target["feasible"]
    assert_in_delta target["required_lift_pp"], 82, 0.000001

    assert_in_delta target["required_additional_payers"],
                    capped["result"]["additional_payers"],
                    0.000001
  end
end
