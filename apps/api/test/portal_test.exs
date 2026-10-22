defmodule IndebtedApi.PortalTest do
  use ExUnit.Case, async: true
  alias IndebtedApi.{Fixtures, Portal, Replay}
  @now ~U[2026-09-16 14:00:00Z]

  test "matching explains each fixed option without creating terms" do
    options = Fixtures.plans()["options"]
    prefs = %{"frequency" => "weekly", "payday" => "2026-09-18", "max_instalment_usd" => 80}
    matched = Portal.match(options, prefs, @now)
    assert Enum.map(matched, & &1["id"]) == Enum.map(options, & &1["id"])
    assert hd(matched)["matches"]
    assert hd(matched)["reason_codes"] == []

    for option <- tl(matched) do
      refute option["matches"]
      assert "frequency_differs" in option["reason_codes"]
      assert "above_stated_amount" in option["reason_codes"]
      assert "outside_payday_window" in option["reason_codes"]
    end

    no_fit = Portal.match(options, %{"max_instalment_usd" => 5}, @now)
    refute Enum.any?(no_fit, & &1["matches"])
    assert Enum.all?(Portal.match(options, %{}, ~U[2026-10-03 00:00:00Z]), &(!&1["matches"]))
  end

  test "preference input is validated at the boundary" do
    for prefs <- [
          %{"frequency" => "daily"},
          %{"payday" => "2026-02-30"},
          %{"max_instalment_usd" => -1},
          %{"new_terms" => true},
          nil
        ] do
      assert {:error, "invalid_preferences"} = Portal.validate_preferences(prefs)
    end
  end

  test "fixed options expose complete schedules and calendar-month completion dates" do
    options = Fixtures.plans()["options"] |> Portal.match(%{}, @now)

    assert Enum.map(options, & &1["last_payment_date"]) == [
             "2026-11-06",
             "2026-11-06",
             "2027-01-02"
           ]

    for option <- options do
      schedule = option["payment_schedule"]
      assert length(schedule) == option["instalments"]
      assert hd(schedule)["date"] == option["first_payment_date"]
      assert List.last(schedule)["date"] == option["last_payment_date"]
      assert Enum.sum(Enum.map(schedule, & &1["amount_usd"])) == option["total_usd"]
      assert Enum.all?(schedule, &(&1["amount_usd"] == option["instalment_usd"]))
    end

    month_end =
      List.last(Fixtures.plans()["options"])
      |> Map.put("first_payment_date", "2028-01-31")

    [option] = Portal.match([month_end], %{}, @now)

    assert Enum.map(option["payment_schedule"], & &1["date"]) ==
             ["2028-01-31", "2028-02-29", "2028-03-31", "2028-04-30"]
  end

  test "confirmation requires explicit choice, reviewed current terms and account availability" do
    initial = Replay.new("plan", Fixtures.scenario("S04"))

    assert {:error, _} =
             Replay.command(initial, %{"type" => "confirm_plan", "option_id" => "weekly-80"})

    portal = Replay.portal(initial)

    command = %{
      "type" => "confirm_plan",
      "option_id" => "weekly-80",
      "confirmed" => true,
      "review_token" => portal["review_token"]
    }

    assert {:error, _} = Replay.command(initial, Map.put(command, "option_id", "invented-plan"))
    assert {:error, _} = Replay.command(initial, Map.put(command, "review_token", "stale"))

    {:ok, changed} =
      Replay.command(initial, %{"type" => "patch_account", "patch" => %{"balance_usd" => 500}})

    assert {:error, _} = Replay.command(changed, command)
    {:ok, confirmed} = Replay.command(initial, command)
    assert Replay.account(confirmed)["plan_status"] == "active"
    assert confirmed.confirmed_plan["simulated"]
    assert confirmed.confirmed_plan["last_payment_date"] == "2026-11-06"

    assert confirmed.confirmed_plan["payment_schedule"] ==
             hd(portal["options"])["payment_schedule"]

    assert length(confirmed.confirmed_plan["payment_schedule"]) == 8
    assert confirmed.payment == nil
    assert confirmed.decision["outcome"] == "SUPPRESS"
    assert {:error, _} = Replay.command(confirmed, command)
  end

  test "help requests for affordability set a hold without a payment or promise of immediate response" do
    initial = Replay.new("help", Fixtures.scenario("S04"))

    {:ok, intent} =
      Replay.command(initial, %{"type" => "record_intent", "intent" => "affordability_concern"})

    assert intent.decision["outcome"] == "ROUTE_TO_SUPPORT"
    {:ok, helped} = Replay.command(intent, %{"type" => "request_help"})
    assert Replay.account(helped)["holds"] == ["hardship_review"]
    assert hd(helped.support_requests)["status"] == "logged"
    assert helped.confirmed_plan == nil
    assert helped.payment == nil
    assert helped.decision["outcome"] == "SUPPRESS"
  end
end
