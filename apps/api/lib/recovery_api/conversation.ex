defmodule RecoveryApi.Conversation do
  @moduledoc "Deterministic, bounded SMS service replies. Never creates terms, payments or account holds."
  alias RecoveryApi.{Policy, Replay}

  @states ~w(account options payday draft resume review payment clarification help pending active_plan change_date change_frequency early_payoff)
  def states, do: @states

  def new(now) do
    %{
      "status" => "awaiting_consumer",
      "mode" => "deterministic",
      "last_intent" => nil,
      "escalation_pending" => false,
      "declared_timing" => nil,
      "preferences" => %{},
      "decision" => nil,
      "jit_actions" => [],
      "draft" => nil,
      "followup" => nil,
      "last_activity_at_utc" => Policy.iso(now),
      "pending_jit_action_id" => nil,
      "messages" => [
        %{
          "id" => "sms-1",
          "direction" => "outbound",
          "kind" => "scheduled_preview",
          "text" =>
            "Hi, this is Debt Recovery. You have an account with a balance still outstanding. You don't have to decide anything from this message.",
          "at_utc" => Policy.iso(now),
          "status" => "baseline_preview_not_sent",
          "template_id" => "baseline_synthetic_v2",
          "jit_action_id" => nil
        },
        %{
          "id" => "sms-2",
          "direction" => "outbound",
          "kind" => "scheduled_preview",
          "text" =>
            "You can set up a payment plan. There are a few options, and you choose when you want to start paying it off. Nothing is charged until you confirm.",
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

      conversation =
        run.conversation
        |> Map.update!("jit_actions", &(&1 ++ [action]))
        |> Map.put("pending_jit_action_id", action["id"])

      {:ok, %{run | conversation: conversation}, action}
    else
      {:error, "invalid_jit_state_or_action_limit"}
    end
  end

  def outcome(run, event) do
    text =
      case event do
        "save_draft" ->
          "I've saved where you got to. It isn't a plan yet, and nothing has been charged. You can come back to it."

        "resume_draft" ->
          "I checked the draft against the account as it is now. Have a look before you confirm anything."

        "confirm_plan" ->
          "That's confirmed. Nothing has been taken today. The first payment is the one on the page you just reviewed."

        "simulate_payment" ->
          "That payment is processing. It isn't paid until it clears, so I won't ask for another one while we wait."

        "request_help" ->
          "I've passed that to the team. I can't say when someone will reply, and you don't need to agree to a payment in the meantime."

        "request_date_change" ->
          "I've asked for the date you wanted. The current schedule stays as it is until someone confirms the change."

        "request_frequency_change" ->
          "I've asked about the frequency you wanted. What you have now stays in place. New terms aren't approved from this text."

        "simulate_early_payoff" ->
          "The balance payment is processing. It isn't settled yet, and your existing plan hasn't been cancelled."

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
          "request_date_change" -> "date_change_requested"
          "request_frequency_change" -> "frequency_change_requested"
          "simulate_early_payoff" -> "payment_pending"
        end

      actions =
        Enum.map(run.conversation["jit_actions"], fn action ->
          completed =
            (event == "confirm_plan" && action["state"] in ~w(options payday draft resume review)) ||
              (event == "simulate_payment" && action["state"] == "payment") ||
              (event == "simulate_early_payoff" && action["state"] == "early_payoff") ||
              (event == "request_date_change" && action["state"] == "change_date") ||
              (event == "request_frequency_change" && action["state"] == "change_frequency")

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
        "escalation_required" =>
          event in ~w(request_help request_date_change request_frequency_change),
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
              "draft" => draft,
              "last_activity_at_utc" => Policy.iso(run.now),
              "status" =>
                if(event in ~w(request_help request_date_change request_frequency_change),
                  do: "awaiting_support",
                  else: "active"
                )
            })
      }

      blocked = service_blocked?(Replay.account(run), "jit_outcome")

      append(
        run,
        "outbound",
        "jit_outcome",
        if(blocked,
          do:
            "Secure task updated. SMS confirmation suppressed after current permission checks; no simulated send.",
          else: text
        ),
        if(blocked, do: "suppressed", else: "simulated_service_reply"),
        "jit_outcome_v2",
        nil
      )
    else
      run
    end
  end

  defp process(run, text) do
    before_account = Replay.account(run)
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
        "early_payoff" -> "explore_payment"
        "plan_setup" -> "explore_plan"
        "date_change" -> "payday_preference"
        "frequency_change" -> "payday_preference"
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

    blocked =
      service_blocked?(account, intent) ||
        (intent == "opt_out" && before_account["sms_allowed"] != true)

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

    conversation =
      Map.merge(run.conversation, %{
        "decision" => decision,
        "last_activity_at_utc" => Policy.iso(run.now),
        "status" =>
          cond do
            blocked || intent == "opt_out" -> "restricted"
            escalation -> "awaiting_support"
            true -> "awaiting_consumer"
          end
      })

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

      Regex.match?(~r/(pay|clear).*(everything|whole|full|balance|debt)|pay.*off/, text) ->
        "early_payoff"

      Regex.match?(
        ~r/(change|move|switch).*(payment date|next payment|date)|payment.*to (next )?friday/,
        text
      ) ->
        "date_change"

      Regex.match?(
        ~r/change.*frequency|pay.*(instead|rather than)|switch.*(weekly|fortnight|monthly)/,
        text
      ) ->
        "frequency_change"

      Regex.match?(~r/pay.*\$\s*\d+.*(now|today)|one.off|pay now/, text) ->
        "one_off_payment"

      Regex.match?(~r/who is|creditor|balance|what is this|account question/, text) ->
        "account_question"

      Regex.match?(~r/interrupt|continue|resume|left off|started.*plan/, text) ->
        "interrupted_plan"

      Regex.match?(~r/(set up|setup|start|create).*(plan|arrangement)/, text) ->
        "plan_setup"

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
         "Understood. I've stopped these messages. You won't get another collection text unless the account is set up to allow them again.",
         false, "acknowledge_opt_out"}

      intent == "dispute" ->
        {"help",
         "Thanks for saying so. I've passed this to a person to look at, and I won't push a payment while that's open. A dispute isn't recorded on the account until the team applies it.",
         true, "route_dispute_to_human"}

      intent == "hardship" ->
        {"help",
         "I'm sorry it's this tight. You don't have to agree to anything here. I can send a link to ask the team for support. They have to apply any hardship hold themselves.",
         true, "route_hardship_to_human"}

      intent == "already_paid" ->
        {"help",
         "Thanks for telling me. I can't see from a text whether that payment has cleared. I'll ask the team to check, and I won't suggest another payment while they do.",
         true, "request_payment_check"}

      run.conversation["escalation_pending"] ->
        {"help",
         "Your earlier message is still with the team. I can help you add to that, but I won't start a new payment arrangement while it's unresolved.",
         true, "await_human_review"}

      account["payment_status"] in ["pending", "settled"] ->
        {"pending",
         "There's already a payment on this account. I won't ask for another one. The link shows whether it's still processing or has cleared.",
         false, "show_payment_status"}

      account["holds"] != [] ->
        {"help",
         "This account is with the team already. I can send a link if you want to add something, but I won't ask you to commit to a payment.",
         true, "route_existing_hold"}

      intent == "early_payoff" ->
        {"early_payoff",
         "If you want to pay the balance in one go, I'll send the current amount so you can check it first. It isn't settled until the payment clears, and it doesn't cancel a plan on its own.",
         false, "review_early_payoff"}

      account["plan_status"] == "active" && intent == "date_change" ->
        {"change_date",
         "I can send a link to ask for a different date. The dates you have now stay as they are until someone confirms the change.",
         false, "request_payment_date_change"}

      account["plan_status"] == "active" &&
          (intent == "frequency_change" ||
             (intent == "plan_preference" && run.preferences["frequency"])) ->
        {"change_frequency",
         "If the current rhythm isn't manageable, I can send a link to ask about another one. What you have now stays in place until that's approved. I can't change the terms from this text.",
         false, "request_frequency_change"}

      account["plan_status"] == "active" ->
        {"active_plan",
         "You already have a plan on this account. I can send what it currently says, or a link if you need the team instead.",
         false, "show_active_arrangement"}

      intent in ["date_change", "frequency_change"] ->
        {"payday",
         "I can check that against the plans already approved. A new date or amount needs approval. I'll send a link so you can see what actually fits.",
         false, "match_approved_arrangements"}

      intent == "plan_setup" ->
        {"options",
         "I can send the arrangements already approved for this account. The link shows the amounts and dates. Nothing is agreed, and nothing is charged, until you confirm.",
         false, "start_plan_setup"}

      intent == "account_question" ->
        {"clarification",
         "I won't put the account details in this text. I'll send a link where you can see the creditor and the balance, or ask the team if something doesn't look right.",
         false, "verify_account_information"}

      intent == "interrupted_plan" && valid_saved_draft?(run) ->
        {"resume",
         "You still have the draft from where you stopped. It isn't an agreement, and nothing has been charged. Here's the link to pick it up and check it still looks right.",
         false, "resume_saved_draft"}

      intent == "interrupted_plan" ->
        {"options",
         "I don't have a saved draft from last time, so there's nothing to pick up. I can send the current approved options if you want to start again.",
         false, "start_new_selection"}

      intent in ["payday_alignment", "plan_preference"] ->
        {"payday", preference_reply(run.preferences), false, "match_approved_arrangements"}

      intent == "one_off_payment" ->
        {"payment",
         "I can send a link for a one-off payment. You'll see the amount before anything happens, and nothing is taken until you confirm it there.",
         false, "review_one_off_payment"}

      true ->
        {"clarification",
         "I can send a link for a plan, for the balance, or to ask the team a question. Tell me which of those you need and I won't take it further than that.",
         false, "ask_clarifying_question"}
    end
  end

  defp valid_saved_draft?(run),
    do:
      run.conversation["draft"] && run.conversation["draft"]["status"] in ["saved", "resumed"] &&
        DateTime.compare(Policy.dt(run.conversation["draft"]["expires_at_utc"]), run.now) == :gt

  defp preference_reply(preferences) do
    frequency = preferences["frequency"]
    amount = preferences["max_instalment_usd"]

    known =
      Enum.reject(
        [
          if(frequency, do: "your #{frequency} pay cycle"),
          if(amount,
            do:
              "$#{:erlang.float_to_binary(amount * 1.0, decimals: 2)} as your preferred instalment"
          )
        ],
        &is_nil/1
      )

    "I've noted #{if(known == [], do: "what you said", else: Enum.join(known, " and "))}. I'll send the approved options so you can see if any of them fit. Nothing is agreed from this text."
  end

  def followup_sent(run, _followup) do
    append(
      run,
      "outbound",
      "scheduled_followup",
      "We haven't heard back. Reply if you want to ask about more time to pay, or if you'd like any more information. You don't have to. Reply STOP if you'd rather not get these texts.",
      "simulated_proactive_send",
      "contextual_options_v3",
      nil
    )
  end

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
