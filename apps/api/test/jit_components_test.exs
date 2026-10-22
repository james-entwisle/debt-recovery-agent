defmodule RecoveryApi.JitComponentsTest do
  use ExUnit.Case, async: true
  alias RecoveryApi.{Fixtures, JitAuth, Replay, Session}

  defp run, do: Replay.new("jit-components", Fixtures.scenario("S04"))

  defp act(run, type, attrs \\ %{}) do
    {:ok, next} = Replay.command(run, Map.put(attrs, "type", type))
    next
  end

  test "saved draft preserves exact step, safe method, ID and created time across updates and return" do
    first =
      run()
      |> act("add_demo_payment_method")
      |> act("save_draft", %{
        "option_id" => "weekly-80",
        "step" => "method",
        "payment_method_id" => "demo_card_1881"
      })

    draft = first.conversation["draft"]

    updated =
      first
      |> act("advance", %{"to_utc" => "2026-09-16T14:01:00Z"})
      |> act("save_draft", %{"option_id" => "weekly-80", "step" => "review"})
      |> act("resume_draft")

    saved = updated.conversation["draft"]
    assert saved["id"] == draft["id"]
    assert saved["created_at_utc"] == draft["created_at_utc"]
    assert saved["updated_at_utc"] != draft["updated_at_utc"]
    assert saved["payment_method_id"] == "demo_card_1881"
    assert saved["step"] == "review"
    assert updated.confirmed_plan == nil && updated.payment == nil

    assert {:error, _} =
             Replay.command(run(), %{
               "type" => "save_draft",
               "option_id" => "weekly-80",
               "step" => "charge",
               "payment_method_id" => "real-card"
             })
  end

  test "masked method add is bounded and confirmation uses only eligible example references" do
    state = run() |> act("add_demo_payment_method") |> act("add_demo_payment_method")
    assert length(state.payment_methods) == 2
    assert Enum.all?(state.payment_methods, &(String.length(&1["last4"]) == 4))
    token = Replay.portal(state)["review_token"]

    command = %{
      "type" => "confirm_plan",
      "option_id" => "weekly-80",
      "confirmed" => true,
      "review_token" => token,
      "payment_method_id" => "invented"
    }

    assert {:error, "eligible_demo_payment_method_required"} = Replay.command(state, command)

    {:ok, confirmed} =
      Replay.command(state, Map.put(command, "payment_method_id", "demo_card_1881"))

    assert confirmed.confirmed_plan["payment_method_id"] == "demo_card_1881"
    assert confirmed.payment == nil
  end

  test "date and frequency requests require active plan, log review and never amend approved terms" do
    state = act(run(), "setup_demo_active_plan")

    for attrs <- [
          %{"change_type" => "date", "requested_date" => "2026-10-09"},
          %{"change_type" => "frequency", "requested_frequency" => "fortnightly"}
        ] do
      assert {:error, _} = Replay.command(run(), Map.put(attrs, "type", "request_plan_change"))
      result = act(state, "request_plan_change", attrs)
      assert result.confirmed_plan == state.confirmed_plan
      assert Replay.account(result) == Replay.account(state)
      [request] = Replay.view(result)["plan_change_requests"]
      assert request["status"] == "requested"
      assert result.conversation["decision"]["escalation_required"]
      assert String.ends_with?(result.conversation["decision"]["chosen_action"], "_requested")
    end

    assert {:error, _} =
             Replay.command(state, %{
               "type" => "request_plan_change",
               "change_type" => "frequency",
               "requested_frequency" => "monthly"
             })
  end

  test "early payoff rechecks reviewed balance, records pending, preserves active plan and rejects duplicate payment" do
    state = act(run(), "setup_demo_active_plan")

    command = %{
      "type" => "simulate_early_payoff",
      "confirmed" => true,
      "reviewed_balance_usd" => 640,
      "payment_method_id" => "demo_card_4242"
    }

    assert {:error, _} = Replay.command(state, Map.put(command, "reviewed_balance_usd", 500))
    assert {:error, _} = Replay.command(state, Map.delete(command, "confirmed"))
    {:ok, result} = Replay.command(state, command)
    assert result.payment["status"] == "pending"
    assert result.payment["amount_usd"] == 640
    assert Replay.account(result)["balance_usd"] == 640
    assert Replay.account(result)["plan_status"] == "active"
    assert result.confirmed_plan == state.confirmed_plan
    assert result.decision["outcome"] == "SUPPRESS"
    assert {:error, _} = Replay.command(result, command)
    blocked = act(state, "patch_account", %{"patch" => %{"holds" => ["dispute"]}})
    assert {:error, _} = Replay.command(blocked, command)
  end

  test "SMS routes the five focused actions using current plan state" do
    active = act(run(), "setup_demo_active_plan")

    for {text, state, task} <- [
          {"I want to set up a plan", run(), "options"},
          {"Can I move my next payment to Friday?", active, "change_date"},
          {"Can I pay fortnightly instead?", active, "change_frequency"},
          {"Can I pay fortnightly?", active, "change_frequency"},
          {"I want to clear my debt", active, "early_payoff"},
          {"I want to pay $100 now", run(), "payment"}
        ] do
      result = act(state, "receive_sms", %{"text" => text})
      assert List.last(result.conversation["jit_actions"])["state"] == task, text
    end

    saved = act(run(), "save_draft", %{"option_id" => "weekly-80", "step" => "method"})
    resumed = act(saved, "receive_sms", %{"text" => "I got interrupted yesterday"})
    assert List.last(resumed.conversation["jit_actions"])["state"] == "resume"
  end

  test "scoped date task cannot request frequency, seed fixtures or initiate payoff" do
    assert JitAuth.permitted?("change_date", %{
             "type" => "request_plan_change",
             "change_type" => "date"
           })

    refute JitAuth.permitted?("change_date", %{
             "type" => "request_plan_change",
             "change_type" => "frequency"
           })

    for state <- ~w(options resume active_plan change_date change_frequency early_payoff),
        do: refute(JitAuth.permitted?(state, %{"type" => "setup_demo_active_plan"}))

    %{"view" => view} = Session.open("S04", "treatment")
    id = view["session_id"]

    %{"view" => view} =
      Session.act(id, "task", %{"type" => "create_jit", "state" => "change_date"})

    action = List.last(view["conversation"]["jit_actions"])["id"]
    %{"token" => token} = Session.issue_link(id, action)
    %{"auth_cookie" => cookie} = Session.verify_link(id, action, token)

    assert Session.authorized_act(id, action, cookie, "wrong", %{
             "type" => "request_plan_change",
             "change_type" => "frequency",
             "requested_frequency" => "weekly"
           })["error"] == "jit_action_not_permitted_for_task"
  end

  test "a secure task outcome does not send SMS after a source opt-out" do
    state = run() |> act("patch_account", %{"patch" => %{"sms_allowed" => false}})
    state = act(state, "save_draft", %{"option_id" => "weekly-80", "step" => "method"})
    assert state.conversation["draft"]["status"] == "saved"
    assert List.last(state.conversation["messages"])["status"] == "suppressed"
    assert state.confirmed_plan == nil
  end
end
