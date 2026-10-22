defmodule IndebtedApi.Conversation do
  @moduledoc "Deterministic, bounded SMS service replies. Never creates terms, payments or account holds."
  alias IndebtedApi.{Policy, Replay}
  @states ~w(account options payday draft resume review payment clarification help pending)
  def states, do: @states

  def new(now) do
    %{
      "status" => "open",
      "mode" => "deterministic",
      "last_intent" => nil,
      "escalation_pending" => false,
      "declared_timing" => nil,
      "preferences" => %{},
      "decision" => nil,
      "jit_actions" => [],
      "draft" => nil,
      "messages" => [
        %{
          "id" => "sms-1",
          "direction" => "outbound",
          "kind" => "scheduled_preview",
          "text" => "InDebted: You can review your options securely or ask our team for help.",
          "at_utc" => Policy.iso(now),
          "status" => "baseline_preview_not_sent",
          "template_id" => "baseline_synthetic_v2",
          "jit_action_id" => nil
        }
      ]
    }
  end

  def receive(run, text) when is_binary(text) do
    text = String.trim(text)

    if byte_size(text) in 1..1000 && length(run.conversation["messages"]) < 120 do
      process(run, text)
    else
      {:error, "sms_text_required_max_1000_bytes_or_conversation_limit"}
    end
  end

  def receive(_, _), do: {:error, "invalid_sms_text"}

  def create_jit(run, state, intent \\ "operator_selected_task") do
    if state in @states && length(run.conversation["jit_actions"]) < 64 do
      action = %{
        "id" => "jit-" <> Base.url_encode64(:crypto.strong_rand_bytes(12), padding: false),
        "consumer_id" => run.scenario["consumer_id"],
        "intent" => intent,
        "state" => state,
        "status" => "verification_required",
        "created_at_utc" => Policy.iso(run.now)
      }

      conversation = Map.update!(run.conversation, "jit_actions", &(&1 ++ [action]))
      {:ok, %{run | conversation: conversation}, action}
    else
      {:error, "invalid_jit_state_or_action_limit"}
    end
  end

  def outcome(run, event) do
    text =
      case event do
        "save_draft" ->
          "Your draft is saved for this demo session. It is not an agreement and no payment has been taken."

        "resume_draft" ->
          "Your saved draft was checked against the current account and approved options. Review it before confirming."

        "confirm_plan" ->
          "Your arrangement was explicitly confirmed in the simulated secure task. No payment has been taken."

        "simulate_payment" ->
          "Your simulated payment is processing. Further collection prompts will be suppressed while it is pending."

        "request_help" ->
          "Your request has been logged for our team. An immediate response is not promised."

        _ ->
          nil
      end

    if text do
      chosen =
        case event do
          "confirm_plan" -> "plan_confirmed"
          "simulate_payment" -> "payment_pending"
          "save_draft" -> "draft_saved"
          "resume_draft" -> "draft_resumed"
          "request_help" -> "help_requested"
        end

      actions =
        Enum.map(run.conversation["jit_actions"], fn action ->
          completed =
            (event == "confirm_plan" && action["state"] in ~w(options payday draft resume review)) ||
              (event == "simulate_payment" && action["state"] == "payment")

          if completed, do: Map.put(action, "status", "completed"), else: action
        end)

      draft = run.conversation["draft"]

      draft =
        if event == "confirm_plan" && draft && draft["option_id"] == run.confirmed_plan["id"],
          do: Map.put(draft, "status", "confirmed"),
          else: draft

      decision = %{
        "intent" => run.conversation["last_intent"] || event,
        "classification" => "authenticated_jit_outcome",
        "allowed_actions" => [],
        "chosen_action" => chosen,
        "reasons" => [
          "explicit_consumer_action_completed",
          "current_account_rechecked",
          "no_automatic_debit"
        ],
        "escalation_required" => event == "request_help",
        "template_id" => "jit_outcome_v2",
        "current_account_checks" =>
          Map.take(
            Replay.account(run),
            ~w(payment_status plan_status pilot_scope_allowed sms_allowed holds timezone)
          ),
        "proactive_contact_policy" => "unchanged; fresh source check at handoff"
      }

      run = %{
        run
        | conversation:
            Map.merge(run.conversation, %{
              "decision" => decision,
              "jit_actions" => actions,
              "draft" => draft
            })
      }

      append(
        run,
        "outbound",
        "jit_outcome",
        text,
        "simulated_service_reply",
        "jit_outcome_v2",
        nil
      )
    else
      run
    end
  end

  defp process(run, text) do
    lower = String.downcase(text)
    intent = classify(lower, run.conversation["last_intent"])

    prefs =
      extract_preferences(text, lower, run.preferences, run.now, Replay.account(run)["timezone"])

    timing =
      if String.contains?(lower, "friday"), do: text, else: run.conversation["declared_timing"]

    run = %{
      run
      | preferences: prefs,
        conversation:
          Map.merge(run.conversation, %{
            "last_intent" => intent,
            "preferences" => prefs,
            "declared_timing" => timing,
            "escalation_pending" =>
              run.conversation["escalation_pending"] ||
                intent in ["hardship", "dispute", "already_paid"]
          })
    }

    run = append(run, "inbound", "consumer_message", text, "received_simulation", nil, nil)

    run =
      if intent == "opt_out",
        do: patch(run, %{"sms_allowed" => false, "email_allowed" => false}),
        else: run

    portal_intent =
      case intent do
        "hardship" -> "affordability_concern"
        "dispute" -> "balance_question"
        "account_question" -> "balance_question"
        "already_paid" -> "request_help"
        "payday_alignment" -> "payday_preference"
        "plan_preference" -> "payday_preference"
        "interrupted_plan" -> "explore_plan"
        "one_off_payment" -> "explore_payment"
        _ -> run.intent
      end

    portal_intent =
      if run.conversation["escalation_pending"] &&
           portal_intent not in ["balance_question", "affordability_concern"],
         do: "request_help",
         else: portal_intent

    run = %{run | intent: portal_intent}
    account = Replay.account(run)
    {state, reply, escalation, chosen} = response(intent, run, account)
    blocked = service_blocked?(account, intent)

    {run, action} =
      if state && !blocked do
        case create_jit(run, state, intent) do
          {:ok, next, action} -> {next, action}
          _ -> {run, nil}
        end
      else
        {run, nil}
      end

    reasons =
      cond do
        blocked ->
          ["service_reply_blocked_by_authoritative_state"]

        intent == "opt_out" ->
          ["explicit_stop_applied_to_channel_permissions", "single_opt_out_acknowledgement_only"]

        account["payment_status"] in ["pending", "settled"] ->
          ["payment_state_prevents_payment_prompt", "requested_service_reply_only"]

        escalation ->
          [
            "human_review_required",
            "no_authoritative_hold_created",
            "requested_service_reply_only"
          ]

        true ->
          [
            "explicit_inbound_request",
            "requested_service_reply_outside_proactive_budget",
            "no_new_proactive_contact"
          ]
      end

    decision = %{
      "intent" => intent,
      "classification" => "consumer_requested_service_reply",
      "allowed_actions" =>
        if(blocked,
          do: [],
          else: Enum.reject([chosen, if(escalation, do: "human_review")], &is_nil/1)
        ),
      "chosen_action" => if(blocked, do: "suppress_reply", else: chosen),
      "reasons" => reasons,
      "escalation_required" => escalation,
      "template_id" => "service_#{intent}_v2",
      "current_account_checks" =>
        Map.take(
          account,
          ~w(payment_status plan_status pilot_scope_allowed sms_allowed holds timezone)
        ),
      "proactive_contact_policy" => "unchanged; fresh source check at handoff"
    }

    conversation = Map.put(run.conversation, "decision", decision)
    run = %{run | conversation: conversation}

    run =
      append(
        run,
        "outbound",
        "proposed_reply",
        reply,
        "proposed_not_sent",
        decision["template_id"],
        action && action["id"]
      )

    run =
      append(
        run,
        "outbound",
        if(blocked, do: "suppressed_reply", else: "approved_reply"),
        if(blocked,
          do:
            "Reply suppressed after current permissions, scope or language check. No simulated send.",
          else: reply
        ),
        if(blocked, do: "suppressed", else: "simulated_service_reply"),
        decision["template_id"],
        action && action["id"]
      )

    {:ok, run}
  end

  defp classify(text, previous) do
    cond do
      Regex.match?(~r/^\s*(stop|unsubscribe|cancel texts|opt out)[.!\s]*$/, text) ->
        "opt_out"

      Regex.match?(~r/don.t recogni[sz]e|not my debt|disput|wrong person/, text) ->
        "dispute"

      Regex.match?(~r/struggl|hardship|can.t afford|cannot afford|lost my job|no money/, text) ->
        "hardship"

      Regex.match?(~r/already paid|i.ve paid|paid this|payment went through/, text) ->
        "already_paid"

      Regex.match?(~r/who is|creditor|balance|what is this|account question/, text) ->
        "account_question"

      Regex.match?(~r/interrupt|continue|resume|left off|started.*plan/, text) ->
        "interrupted_plan"

      Regex.match?(
        ~r/payday|get paid|paid (every|fortnight|weekly|monthly)|next friday|pay cycle|second friday/,
        text
      ) ->
        "payday_alignment"

      Regex.match?(~r/\$\s*\d|fortnight|weekly|monthly|every.*week/, text) ->
        "plan_preference"

      Regex.match?(~r/pay now|one.off|full amount/, text) ->
        "one_off_payment"

      previous in ["payday_alignment", "plan_preference"] && Regex.match?(~r/^yes\b/, text) ->
        "plan_preference"

      true ->
        "clarification"
    end
  end

  defp extract_preferences(text, lower, existing, now, timezone) do
    frequency =
      cond do
        Regex.match?(~r/fortnight|every (second|other|two) (friday|week)|biweekly/, lower) ->
          "fortnightly"

        String.contains?(lower, "weekly") || String.contains?(lower, "every week") ->
          "weekly"

        String.contains?(lower, "monthly") || String.contains?(lower, "every month") ->
          "monthly"

        true ->
          nil
      end

    amount =
      case Regex.run(~r/\$\s*(\d+(?:\.\d{1,2})?)/, text) do
        [_, number] ->
          {value, ""} = Float.parse(number)
          if value > 0 && value <= 1_000_000, do: value

        _ ->
          nil
      end

    payday =
      if String.contains?(lower, "friday") do
        local =
          case DateTime.shift_zone(now, timezone || "Etc/UTC", Tzdata.TimeZoneDatabase) do
            {:ok, local} -> local
            _ -> now
          end

        today = DateTime.to_date(local)
        days = rem(5 - Date.day_of_week(today) + 7, 7)
        Date.add(today, if(days == 0, do: 7, else: days)) |> Date.to_iso8601()
      end

    existing
    |> maybe_put("frequency", frequency)
    |> maybe_put("max_instalment_usd", amount)
    |> maybe_put("payday", payday)
  end

  defp response(intent, run, account) do
    cond do
      intent == "opt_out" ->
        {nil,
         "Your opt-out is recorded in this simulation. No further collection messages will be sent unless permissions are explicitly restored by the account service.",
         false, "acknowledge_opt_out"}

      intent == "dispute" ->
        {"help",
         "Thank you for telling us. I will route your question for human review and pause adaptive payment prompts. A formal dispute hold must be applied by the account team.",
         true, "route_dispute_to_human"}

      intent == "hardship" ->
        {"help",
         "I’m sorry things are difficult. You do not need to commit to a payment here. You can ask our team about support; a human will review any formal hardship hold.",
         true, "route_hardship_to_human"}

      intent == "already_paid" ->
        {"help",
         "Thank you. I cannot confirm settlement from a message. Our team can check the payment; adaptive payment prompts are paused while your request is reviewed.",
         true, "request_payment_check"}

      run.conversation["escalation_pending"] ->
        {"help",
         "Your earlier concern is awaiting team review. I can help you request assistance; I will not suggest a new payment arrangement while it is unresolved.",
         true, "await_human_review"}

      account["payment_status"] in ["pending", "settled"] ->
        {"pending",
         "You can review the latest status securely. I won’t suggest another payment here.",
         false, "show_payment_status"}

      account["plan_status"] == "active" ->
        {"account",
         "You can review the latest account information securely or ask our team for help. I won’t suggest a new arrangement here.",
         false, "show_active_arrangement"}

      account["holds"] != [] ->
        {"help",
         "This account needs team review. I can help you request assistance, without asking you to commit to payment.",
         true, "route_existing_hold"}

      intent == "account_question" ->
        {"clarification",
         "You can check the account and creditor details after verification, or ask our team a question. I won’t put private account details in this text.",
         false, "verify_account_information"}

      intent == "interrupted_plan" && valid_saved_draft?(run) ->
        {"resume",
         "There is an unconfirmed draft saved in this demo session. Open the secure return task to recheck and resume it. No agreement or debit has been created.",
         false, "resume_saved_draft"}

      intent == "interrupted_plan" ->
        {"options",
         "A previous plan-start event does not contain saved form data. There is no usable saved draft here, so you can make a fresh selection from approved options.",
         false, "start_new_selection"}

      intent in ["payday_alignment", "plan_preference"] ->
        {"payday",
         "I’ve noted your stated preferences. You can review the existing approved options securely. We will check whether any fit; this does not approve new terms or establish affordability.",
         false, "match_approved_arrangements"}

      intent == "one_off_payment" ->
        {"payment",
         "You can review a one-off payment securely. Nothing is authorised until you explicitly confirm in the simulated payment task.",
         false, "review_one_off_payment"}

      true ->
        {"clarification",
         "I can help you review approved options, check an account question, or ask our team for support. Which would be useful?",
         false, "ask_clarifying_question"}
    end
  end

  defp valid_saved_draft?(run),
    do:
      run.conversation["draft"] && run.conversation["draft"]["status"] in ["saved", "resumed"] &&
        DateTime.compare(Policy.dt(run.conversation["draft"]["expires_at_utc"]), run.now) == :gt

  defp service_blocked?(account, intent),
    do:
      intent != "opt_out" &&
        (account["sms_allowed"] != true || account["pilot_scope_allowed"] != true ||
           account["language"] != "en")

  defp maybe_put(map, _, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp patch(run, patch),
    do: %{run | local_updates: run.local_updates ++ [%{at: run.now, changes: patch}]}

  defp append(run, direction, kind, text, status, template, action) do
    message = %{
      "id" => "sms-#{length(run.conversation["messages"]) + 1}",
      "direction" => direction,
      "kind" => kind,
      "text" => text,
      "at_utc" => Policy.iso(run.now),
      "status" => status,
      "template_id" => template,
      "jit_action_id" => action
    }

    %{run | conversation: Map.update!(run.conversation, "messages", &(&1 ++ [message]))}
  end
end
