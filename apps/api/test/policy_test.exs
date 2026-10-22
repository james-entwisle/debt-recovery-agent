defmodule RecoveryApi.PolicyTest do
  use ExUnit.Case, async: true
  alias RecoveryApi.{Fixtures, Policy}
  @now ~U[2026-09-16 14:00:00Z]

  defp account, do: Fixtures.scenario("S04")["state_at_decision"]

  defp attempt(id, at, channel \\ "email"),
    do: %{"attempt_id" => id, "attempted_at_utc" => at, "channel" => channel}

  defp evaluate(scenario, overrides \\ %{}) do
    Policy.evaluate(
      Map.merge(scenario["state_at_decision"], overrides),
      scenario["incoming_events"],
      nil,
      Enum.map(scenario["queued_contacts"], &Map.put(&1, "status", "queued")),
      scenario["contact_history"],
      @now
    )
  end

  test "S04 proposes one replacement and does not execute it" do
    decision = evaluate(Fixtures.scenario("S04"))
    assert decision["outcome"] == "DEFER"
    assert decision["proposal"]["contact_id"] == "Q04"
    assert decision["proposal"]["template_id"] == "plan_options_v1"
    assert decision["proposal"]["scheduled_at_utc"] == "2026-09-16T14:15:00Z"
    assert decision["proposal"]["original_scheduled_at_utc"] == "2026-09-18T14:00:00Z"
    refute decision["executed"]
    assert decision["evidence_event_ids"] == ["E04"]
    assert "send_time_recheck_required" in decision["reason_codes"]
  end

  test "S01 open alone does not change the journey" do
    assert evaluate(Fixtures.scenario("S01"))["outcome"] == "NO_ACTION"
  end

  test "S07 shared budget is shown as exhausted" do
    decision = evaluate(Fixtures.scenario("S07"))
    assert decision["eligibility"]["attempts_24h"] == 1
    assert decision["eligibility"]["attempts_7d"] == 3

    reasons =
      Policy.handoff_reasons(account(), "sms", Fixtures.scenario("S07")["contact_history"], @now)

    assert "rolling_24h_limit" in reasons
    assert "rolling_7d_limit" in reasons
  end

  for {scenario, reason} <- [
        {"S08", "timezone_unknown_or_invalid"},
        {"S09", "outside_pilot_scope"},
        {"S10", "account_hold_or_unknown"},
        {"S12", "plan_active_or_unknown"}
      ] do
    test "#{scenario} suppresses with #{reason}" do
      result = evaluate(Fixtures.scenario(unquote(scenario)))
      assert result["outcome"] == "SUPPRESS"
      assert unquote(reason) in result["reason_codes"]
      assert result["proposal"] == nil
    end
  end

  test "every unknown required field blocks outreach" do
    for field <-
          ~w(balance_usd pilot_scope_allowed language payment_status plan_status holds email_allowed sms_allowed timezone) do
      result = evaluate(Fixtures.scenario("S04"), %{field => nil})
      assert result["outcome"] == "SUPPRESS", field
      assert "required_state_unknown" in result["reason_codes"]
    end
  end

  test "channel permission is independent of engagement" do
    decision = evaluate(Fixtures.scenario("S04"), %{"sms_allowed" => false})
    assert decision["proposal"]["channel"] == "email"

    assert "channel_permission_denied" in Policy.handoff_reasons(
             Map.put(account(), "sms_allowed", false),
             "sms",
             [],
             @now
           )

    assert evaluate(Fixtures.scenario("S04"), %{"sms_allowed" => false, "email_allowed" => false})[
             "outcome"
           ] == "SUPPRESS"
  end

  test "exact rolling boundaries count across channels; future attempts do not" do
    history = [
      attempt("a", "2026-09-15T14:00:00Z", "sms"),
      attempt("b", "2026-09-09T14:00:00Z"),
      attempt("c", "2026-09-10T14:00:00Z"),
      attempt("future", "2026-09-17T14:00:00Z")
    ]

    assert Policy.count(history, @now, 86400) == 1
    assert Policy.count(history, @now, 604_800) == 3
    assert Policy.count(history, DateTime.add(@now, 1, :microsecond), 86400) == 0
    assert Policy.count(history, DateTime.add(@now, 1, :microsecond), 604_800) == 2
    next = Policy.next_permitted(account(), history, @now)
    assert Policy.count(history, next, 86400) == 0
    assert Policy.count(history, next, 604_800) < 3
  end

  test "transactional receipts, requested replies and duplicate attempt records are excluded" do
    base = attempt("a", "2026-09-16T13:00:00Z")

    history = [
      base,
      base,
      Map.put(attempt("b", "2026-09-16T13:00:00Z"), "transactional", true),
      Map.put(attempt("c", "2026-09-16T13:00:00Z"), "kind", "requested_service_reply")
    ]

    assert Policy.count(history, @now, 86400) == 1
  end

  test "local weekday window is 09:00 inclusive and 18:00 exclusive" do
    assert Policy.in_window?(account(), ~U[2026-09-16 13:00:00Z])
    refute Policy.in_window?(account(), ~U[2026-09-16 12:59:59Z])
    refute Policy.in_window?(account(), ~U[2026-09-16 22:00:00Z])
    refute Policy.in_window?(account(), ~U[2026-09-19 14:00:00Z])
    next = Policy.next_permitted(account(), [], ~U[2026-09-18 22:00:00Z])
    assert next == ~U[2026-09-21 13:00:00Z]
  end

  test "timezone database observes daylight saving and narrower preferences" do
    assert Policy.in_window?(account(), ~U[2026-11-02 14:00:00Z])
    refute Policy.in_window?(account(), ~U[2026-11-02 13:00:00Z])

    narrower =
      Map.put(account(), "contact_window_override", %{
        "start_hour" => 11,
        "end_hour" => 15,
        "weekdays" => [3]
      })

    refute Policy.in_window?(narrower, @now)
    assert Policy.in_window?(narrower, ~U[2026-09-16 15:00:00Z])
    refute Policy.in_window?(narrower, ~U[2026-09-17 15:00:00Z])

    assert "contact_preference_unknown_or_invalid" in Policy.restrictions(
             Map.put(narrower, "contact_window_override", %{"start_hour" => 8})
           )
  end

  test "only ingested, recent events qualify; duplicate and out-of-order delivery is harmless" do
    scenario = Fixtures.scenario("S04")
    event = hd(scenario["incoming_events"])
    invisible = Map.put(event, "ingested_at_utc", "2026-09-16T14:01:00Z")
    assert evaluate(Map.put(scenario, "incoming_events", [invisible]))["outcome"] == "NO_ACTION"
    stale = Map.put(event, "occurred_at_utc", "2026-09-15T13:59:59Z")
    assert evaluate(Map.put(scenario, "incoming_events", [stale]))["outcome"] == "NO_ACTION"
    duplicate = evaluate(Fixtures.scenario("S11"))
    assert duplicate["evidence_event_ids"] == ["E11"]

    click =
      Map.merge(event, %{
        "event_id" => "click",
        "type" => "message_click",
        "occurred_at_utc" => "2026-09-16T13:45:00Z"
      })

    assert evaluate(Map.put(scenario, "incoming_events", [click, event]))["consumer_context"] ==
             "plan_options"
  end

  test "waiting interval defers proposal and control leaves existing journey" do
    scenario = Fixtures.scenario("S04")

    early =
      Policy.evaluate(
        scenario["state_at_decision"],
        scenario["incoming_events"],
        nil,
        Enum.map(scenario["queued_contacts"], &Map.put(&1, "status", "queued")),
        [],
        ~U[2026-09-16 13:40:00Z]
      )

    assert early["outcome"] == "DEFER"

    control =
      Policy.evaluate(account(), scenario["incoming_events"], nil, [], [], @now, %{
        "arm" => "control"
      })

    assert control["reason_codes"] == ["control_existing_journey"]
    assert control["proposal"] == nil
  end
end
