defmodule IndebtedApi.ConversationTest do
  use ExUnit.Case, async: true
  alias IndebtedApi.{Fixtures, Replay, Session}
  defp run, do: Replay.new("conversation", Fixtures.scenario("S04"))

  defp act(run, type, fields \\ %{}) do
    {:ok, next} = Replay.command(run, Map.put(fields, "type", type))
    next
  end

  defp sms(run, text), do: act(run, "receive_sms", %{"text" => text})

  test "synthetic SMS fixtures produce distinct intents and preserve private details" do
    fixture =
      File.read!(Path.join(:code.priv_dir(:indebted_api), "fixtures/inbound_sms_examples.json"))
      |> Jason.decode!()

    for example <- fixture["examples"] do
      result = sms(run(), example["text"])
      assert result.conversation["last_intent"] == example["intent"]

      assert result.conversation["decision"]["classification"] ==
               "consumer_requested_service_reply"

      assert length(result.conversation["messages"]) == 4
      reply = List.last(result.conversation["messages"])
      refute String.contains?(reply["text"], "640")
      refute String.contains?(reply["text"], "Harbour")
    end
  end

  test "multi-turn preferences retain frequency and payday without inventing approved terms" do
    result = run() |> sms("I get paid every second Friday.") |> sms("Yes, around $50.")

    assert result.preferences == %{
             "frequency" => "fortnightly",
             "payday" => "2026-09-18",
             "max_instalment_usd" => 50.0
           }

    assert result.conversation["last_intent"] == "plan_preference"
    assert List.last(result.conversation["jit_actions"])["state"] == "payday"
    refute Enum.any?(Replay.portal(result)["options"], & &1["matches"])
    assert result.confirmed_plan == nil
    assert result.payment == nil
    assert length(result.contacts) == length(run().contacts)
    assert result.history == run().history
  end

  test "requested service replies do not consume or bypass proactive contact budget" do
    result = run() |> act("exhaust_contact_budget") |> sms("Who is this creditor?")
    assert List.last(result.conversation["messages"])["status"] == "simulated_service_reply"
    assert result.decision["outcome"] == "ROUTE_TO_SUPPORT"
    assert length(result.history) == length(run().history) + 1
    assert Enum.any?(result.history, &String.starts_with?(&1["attempt_id"], "operator-budget"))
  end

  test "STOP updates source permissions immediately and later requested payment prompts are suppressed" do
    result = run() |> act("schedule") |> sms("STOP")
    refute Replay.account(result)["sms_allowed"]
    refute Replay.account(result)["email_allowed"]
    assert result.decision["outcome"] == "SUPPRESS"
    result = sms(result, "Can I pay $50 every fortnight?")
    assert List.last(result.conversation["messages"])["status"] == "suppressed"
    assert result.conversation["jit_actions"] == []
    result = act(result, "advance", %{"to_utc" => "2026-09-16T14:15:00Z"})
    assert hd(result.contacts)["status"] == "suppressed"
  end

  test "pending payment produces status response instead of another payment prompt" do
    result =
      run()
      |> act("patch_account", %{"patch" => %{"payment_status" => "pending"}})
      |> sms("Can I pay $50 every fortnight?")

    assert result.conversation["decision"]["chosen_action"] == "show_payment_status"
    assert List.last(result.conversation["jit_actions"])["state"] == "pending"
    assert result.decision["outcome"] == "SUPPRESS"
  end

  test "hardship and disputes escalate, pause contact and never create authoritative holds" do
    for text <- ["I'm struggling with money", "I don't recognise this debt."] do
      result = run() |> sms(text) |> sms("Can I pay $50 every fortnight?")
      assert result.conversation["decision"]["escalation_required"]
      assert result.conversation["decision"]["chosen_action"] == "await_human_review"
      assert Replay.account(result)["holds"] == []
      result = act(result, "advance", %{"to_utc" => "2026-09-18T14:00:00Z"})
      assert hd(result.contacts)["status"] == "suppressed"
      assert length(result.history) == length(run().history)
      result = act(result, "patch_account", %{"patch" => %{"holds" => ["human_review"]}})
      assert Replay.account(result)["holds"] == ["human_review"]
    end
  end

  test "supplied plan start event is not a saved draft; actual saved draft is resumable" do
    result = sms(run(), "I got interrupted setting up a plan")
    assert result.conversation["decision"]["chosen_action"] == "start_new_selection"
    saved = act(result, "save_draft", %{"option_id" => "weekly-80"})
    assert saved.conversation["draft"]["status"] == "saved"
    assert saved.confirmed_plan == nil
    assert saved.payment == nil
    resumed = saved |> sms("Can I resume my plan?") |> act("resume_draft")
    assert resumed.conversation["draft"]["status"] == "resumed"
    assert resumed.conversation["decision"]["chosen_action"] == "draft_resumed"
  end

  test "draft revalidation rejects changed balance, holds, pending payment and active plans" do
    saved = act(run(), "save_draft", %{"option_id" => "weekly-80"})

    for patch <- [
          %{"balance_usd" => 500},
          %{"holds" => ["hardship"]},
          %{"payment_status" => "pending"},
          %{"plan_status" => "active"}
        ] do
      changed = saved |> act("patch_account", %{"patch" => patch}) |> act("resume_draft")
      assert changed.conversation["draft"]["status"] == "invalid"
      assert changed.confirmed_plan == nil
      assert changed.payment == nil
    end
  end

  test "expired draft has explicit recovery and cannot confirm from old review" do
    saved = run() |> act("save_draft", %{"option_id" => "weekly-80"}) |> act("expire_draft")
    resumed = act(saved, "resume_draft")
    assert resumed.conversation["draft"]["status"] == "invalid"
    assert resumed.conversation["draft"]["invalid_reason"] == "expired"

    assert {:error, "draft_expired_or_invalid_select_and_save_again"} =
             Replay.command(resumed, %{
               "type" => "confirm_plan",
               "option_id" => "weekly-80",
               "confirmed" => true,
               "review_token" => Replay.portal(resumed)["review_token"]
             })

    recovered = act(resumed, "save_draft", %{"option_id" => "weekly-80"})
    assert recovered.conversation["draft"]["status"] == "saved"
  end

  test "SMS commands retain existing per-session idempotency" do
    %{"view" => view} = Session.open("S04", "treatment")
    id = view["session_id"]
    command = %{"type" => "receive_sms", "text" => "I get paid fortnightly"}
    first = Session.act(id, "sms-once", command)
    assert first == Session.act(id, "sms-once", command)
    assert length(first["view"]["conversation"]["messages"]) == 4
  end
end
