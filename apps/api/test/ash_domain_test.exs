defmodule RecoveryApi.AshDomainTest do
  use ExUnit.Case, async: true
  alias RecoveryApi.{AdaptiveResolution, Fixtures}
  alias RecoveryApi.AdaptiveResolution.{ApprovedPlanOption, JourneyDecision}
  @now ~U[2026-09-16 14:00:00Z]
  @engine %{role: :journey_engine, simulation: true}
  @portal %{role: :portal, simulation: true}

  defp evaluate(actor, opts \\ []) do
    scenario = Fixtures.scenario("S04")

    AdaptiveResolution.evaluate_journey(
      scenario["state_at_decision"],
      scenario["incoming_events"],
      nil,
      Enum.map(scenario["queued_contacts"], &Map.put(&1, "status", "queued")),
      scenario["contact_history"],
      @now,
      %{},
      Keyword.merge([actor: actor], opts)
    )
  end

  test "domain exposes typed decision resource and code interface" do
    {:ok, %JourneyDecision{} = decision} = evaluate(@engine)
    assert decision.outcome == :DEFER
    assert %DateTime{} = decision.evaluated_at_utc
    assert decision.id
    assert decision.policy_version == "pilot-policy-v1"
    assert JourneyDecision.to_map(decision)["outcome"] == "DEFER"
    refute decision.executed
    assert Ash.Domain.Info.resources(AdaptiveResolution) == [JourneyDecision, ApprovedPlanOption]
  end

  test "Ash policies reject anonymous, wrong-role and non-simulated decision callers" do
    for actor <- [
          nil,
          @portal,
          %{role: :journey_engine, simulation: false},
          %{role: :journey_engine}
        ] do
      assert {:error, %Ash.Error.Forbidden{}} = evaluate(actor)
    end

    assert_raise Ash.Error.Forbidden.DomainRequiresAuthorization, fn ->
      evaluate(nil, authorize?: false)
    end
  end

  test "plan action loads fixed terms and returns a typed, explained match" do
    {:ok, %ApprovedPlanOption{} = option} =
      AdaptiveResolution.match_approved_option(
        "weekly-80",
        %{"frequency" => "weekly", "max_instalment_usd" => 80},
        @now,
        640,
        actor: @portal
      )

    assert option.frequency == :weekly
    assert option.first_payment_date == ~D[2026-09-18]
    assert option.last_payment_date == ~D[2026-11-06]
    assert hd(option.payment_schedule) == %{"date" => "2026-09-18", "amount_usd" => 80}
    assert option.instalment_usd == 80
    assert option.instalments == 8
    assert option.total_usd == 640
    assert option.matches

    {:ok, mismatch} =
      AdaptiveResolution.match_approved_option("weekly-80", %{}, @now, 500, actor: @portal)

    refute mismatch.matches
    assert "option_balance_mismatch" in mismatch.reason_codes
  end

  test "plan policies reject non-portal callers and action cannot invent terms" do
    assert {:error, %Ash.Error.Forbidden{}} =
             AdaptiveResolution.match_approved_option("weekly-80", %{}, @now, 640, actor: @engine)

    assert {:error, %Ash.Error.Forbidden{}} =
             AdaptiveResolution.match_approved_option("weekly-80", %{}, @now, 640)

    assert {:error, %Ash.Error.Invalid{}} =
             AdaptiveResolution.match_approved_option("invented", %{}, @now, 640, actor: @portal)

    assert {:error, %Ash.Error.Invalid{}} =
             AdaptiveResolution.match_approved_option(
               "weekly-80",
               %{"payday" => "bad"},
               @now,
               640,
               actor: @portal
             )

    assert {:error, %Ash.Error.Invalid{}} =
             ApprovedPlanOption
             |> Ash.Changeset.for_create(
               :match_preferences,
               %{
                 option_id: "weekly-80",
                 preferences: %{},
                 now: @now,
                 balance_usd: 640,
                 instalment_usd: 1
               },
               actor: @portal
             )
             |> Ash.create()
  end
end
