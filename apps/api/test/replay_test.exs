defmodule RecoveryApi.ReplayTest do
  use ExUnit.Case, async: true
  alias RecoveryApi.{Fixtures, Policy, Replay, Session}

  defp run(id \\ "S04"), do: Replay.new("test", Fixtures.scenario(id))

  defp act(run, type, fields \\ %{}) do
    {:ok, next} = Replay.command(run, Map.put(fields, "type", type))
    next
  end

  test "S04 schedules a contextual replacement, then hands it off exactly once" do
    initial = run()
    assert initial.history == Fixtures.scenario("S04")["contact_history"]
    assert hd(initial.contacts)["pilot"] == false
    scheduled = act(initial, "schedule")
    assert length(scheduled.contacts) == 1
    assert hd(scheduled.contacts)["contact_id"] == "Q04"
    assert hd(scheduled.contacts)["template_id"] == "plan_options_v1"
    repeated = act(scheduled, "schedule")
    assert hd(repeated.contacts)["original_contact"] == hd(initial.contacts)
    assert hd(repeated.contacts)["scheduled_at_utc"] == "2026-09-16T14:15:00Z"

    assert Replay.view(repeated)["original_contacts"] ==
             Fixtures.scenario("S04")["queued_contacts"]

    sent = act(repeated, "advance", %{"to_utc" => "2026-09-16T14:15:00Z"})
    assert hd(sent.contacts)["status"] == "handed_off"
    assert length(sent.history) == 2
    assert List.last(sent.history)["attempted_at_utc"] == "2026-09-16T14:15:00Z"
    later = act(sent, "advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
    assert length(later.history) == 2
    assert length(act(sent, "handoff", %{"contact_id" => "Q04"}).history) == 2
    audit = Enum.find(sent.audit, &(&1["event"] == "provider_handoff_simulated"))
    assert audit["details"]["account_at_handoff"]["plan_status"] == "started"
    assert audit["details"]["disclosure_version"] == "exercise-placeholder-v1"
    assert audit["details"]["template_id"] == "plan_options_v1"
    assert audit["simulated"]
  end

  for {id, reason, notification} <- [
        {"S05", "no_permitted_channel", "E05-optout"},
        {"S06", "payment_pending_or_settled", "E06-payment"}
      ] do
    test "#{id} rechecks authority before its delayed event arrives" do
      initial = run(unquote(id))
      assert initial.decision["outcome"] == "DEFER"
      assert Replay.account(initial)["email_allowed"]
      assert Replay.account(initial)["payment_status"] == "none"
      assert length(Replay.view(initial)["events"]) == 1
      scheduled = act(initial, "schedule")
      changed = act(scheduled, "advance", %{"to_utc" => "2026-09-16T14:15:00Z"})
      refute Enum.any?(Replay.view(changed)["events"], &(&1["event_id"] == unquote(notification)))
      assert unquote(reason) in changed.decision["reason_codes"]
      assert hd(changed.contacts)["status"] == "suppressed"
      assert hd(changed.contacts)["scheduled_at_utc"] == "2026-09-16T14:15:00Z"
      assert length(changed.history) == 1
      audit = Enum.find(changed.audit, &(&1["event"] == "contact_suppressed"))
      assert audit["at_utc"] == "2026-09-16T14:15:00Z"
      assert unquote(reason) in audit["details"]["reason_codes"]
      refute audit["details"]["provider_handoff"]
      final = act(changed, "advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
      assert Enum.any?(Replay.view(final)["events"], &(&1["event_id"] == unquote(notification)))
      assert length(final.history) == 1
    end
  end

  test "S11 duplicate delivery has one event, one contact and an audit explanation" do
    initial = run("S11")
    assert length(Replay.view(initial)["events"]) == 1
    assert Enum.any?(initial.audit, &(&1["event"] == "duplicate_event_ignored"))
    final = initial |> act("schedule") |> act("advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
    assert length(final.contacts) == 1
    assert length(final.history) == 2
  end

  test "two due contacts share a serial budget, including failed delivery" do
    scenario = Fixtures.scenario("S04")
    first = hd(scenario["queued_contacts"]) |> Map.put("scheduled_at_utc", "2026-09-16T14:00:00Z")
    second = Map.merge(first, %{"contact_id" => "other", "channel" => "email"})
    initial = Replay.new("two", Map.put(scenario, "queued_contacts", [first, second]))
    failed = act(initial, "handoff", %{"contact_id" => "Q04", "delivery_result" => "failed"})
    assert List.last(failed.history)["delivery_result"] == "failed"
    deferred = act(failed, "handoff", %{"contact_id" => "other"})
    assert length(deferred.history) == 2
    other = Enum.find(deferred.contacts, &(&1["contact_id"] == "other"))
    assert other["status"] == "queued"
    assert Policy.dt(other["scheduled_at_utc"]) == ~U[2026-09-17 14:00:01Z]
    final = act(deferred, "advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
    assert Enum.all?(final.contacts, &(&1["status"] == "handed_off"))
    assert length(final.history) == 3
    assert List.last(final.history)["attempted_at_utc"] == other["scheduled_at_utc"]
  end

  test "advancing time processes newly deferred due times rather than skipping to target" do
    scenario = Fixtures.scenario("S04")

    contact =
      hd(scenario["queued_contacts"]) |> Map.put("scheduled_at_utc", "2026-09-16T22:00:00Z")

    initial = Replay.new("outside", Map.put(scenario, "queued_contacts", [contact]))
    final = act(initial, "advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
    assert List.last(final.history)["attempted_at_utc"] == "2026-09-17T13:00:00Z"
    assert Enum.any?(final.audit, &(&1["event"] == "contact_deferred"))
  end

  test "a source patch at the exact handoff time wins over the stale engagement snapshot" do
    scenario = Fixtures.scenario("S06")

    contact =
      hd(scenario["queued_contacts"]) |> Map.put("scheduled_at_utc", "2026-09-16T14:10:00Z")

    final =
      Replay.new("race", Map.put(scenario, "queued_contacts", [contact]))
      |> act("advance", %{"to_utc" => "2026-09-16T14:11:00Z"})

    assert hd(final.contacts)["status"] == "suppressed"
    assert length(final.history) == 1
    refute Enum.any?(Replay.view(final)["events"], &(&1["type"] == "payment_initiated"))
  end

  test "stop control cancels pilot sends, and handed-off attempts cannot be recalled" do
    stopped =
      run()
      |> act("schedule")
      |> act("set_stop", %{"stopped" => true})
      |> act("advance", %{"to_utc" => "2026-09-18T14:00:00Z"})

    assert hd(stopped.contacts)["status"] == "suppressed"
    assert length(stopped.history) == 1

    sent =
      run()
      |> act("schedule")
      |> act("advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
      |> act("set_stop", %{"stopped" => true})

    assert hd(sent.contacts)["status"] == "handed_off"
    assert length(sent.history) == 2
  end

  test "explicit help and review-later choices pause an already queued pilot replacement" do
    for intent <- ~w(review_later balance_question affordability_concern request_help) do
      final =
        run()
        |> act("schedule")
        |> act("record_intent", %{"intent" => intent})
        |> act("advance", %{"to_utc" => "2026-09-18T14:00:00Z"})

      assert hd(final.contacts)["status"] == "suppressed"
      assert length(final.history) == 1

      assert Enum.any?(final.audit, fn entry ->
               "consumer_requested_pause" in (entry["details"]["reason_codes"] || [])
             end)
    end
  end

  test "command ids prevent duplicate effects and reject conflicting reuse" do
    %{"view" => view} = Session.open("S04", "treatment")
    id = view["session_id"]
    command = %{"type" => "request_help"}
    first = Session.act(id, "once", command)
    assert first == Session.act(id, "once", command)
    assert length(first["view"]["support_requests"]) == 1
    assert Session.act(id, "once", %{"type" => "evaluate"})["error"] == "command_id_conflict"
  end

  test "sessions isolate state and serialize concurrent duplicate commands" do
    %{"view" => first} = Session.open("S04", "treatment")
    %{"view" => second} = Session.open("S04", "treatment")

    results =
      1..8
      |> Task.async_stream(fn _ ->
        Session.act(first["session_id"], "help", %{"type" => "request_help"})
      end)
      |> Enum.to_list()

    assert Enum.all?(results, fn {:ok, result} ->
             length(result["view"]["support_requests"]) == 1
           end)

    assert Session.get(second["session_id"])["view"]["support_requests"] == []
  end

  test "malformed commands, backward clocks and invalid source patches are rejected" do
    initial = run()
    assert {:error, _} = Replay.command(initial, %{"type" => "advance", "to_utc" => "bad"})

    assert {:error, _} =
             Replay.command(initial, %{"type" => "advance", "to_utc" => "2026-09-16T13:00:00Z"})

    assert {:error, _} =
             Replay.command(initial, %{
               "type" => "patch_account",
               "patch" => %{"email_allowed" => "yes"}
             })

    assert {:error, _} =
             Replay.command(initial, %{"type" => "patch_account", "patch" => %{"unknown" => true}})

    assert {:error, _} =
             Replay.command(initial, %{
               "type" => "simulate_payment",
               "confirmed" => false,
               "amount_usd" => 10
             })
  end
end
