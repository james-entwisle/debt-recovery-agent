defmodule RecoveryApi.Replay do
  @moduledoc "Pure simulated account, event and contact transitions. No provider or payment integration."
  alias RecoveryApi.{AdaptiveResolution, Conversation, Fixtures, PaymentMethods, Policy, Portal}
  alias RecoveryApi.AdaptiveResolution.{ApprovedPlanOption, JourneyDecision}

  @patch_keys ~w(balance_usd pilot_scope_allowed language timezone email_allowed sms_allowed payment_status plan_status holds contact_window_override)

  def new(id, scenario, arm \\ "treatment") do
    now = Policy.dt(scenario["decision_time_utc"])

    run = %{
      id: id,
      scenario: scenario,
      now: now,
      revision: 0,
      arm: arm,
      intent: nil,
      preferences: %{},
      local_updates: [],
      history: scenario["contact_history"],
      contacts:
        Enum.map(
          scenario["queued_contacts"],
          &Map.merge(&1, %{"status" => "queued", "pilot" => false})
        ),
      audit: [],
      seen_deliveries: MapSet.new(),
      seen_events: MapSet.new(),
      stopped: false,
      support_requests: [],
      confirmed_plan: nil,
      payment: nil,
      payment_methods: PaymentMethods.initial(),
      decision: nil,
      conversation: Conversation.new(now)
    }

    run |> ingest() |> evaluate("session_opened")
  end

  def command(run, %{"type" => "evaluate"}), do: {:ok, evaluate(run, "manual_evaluation")}

  def command(run, %{"type" => "advance", "to_utc" => to}) when is_binary(to) do
    with {:ok, target, _} <- DateTime.from_iso8601(to),
         true <- DateTime.compare(target, run.now) != :lt,
         true <- DateTime.diff(target, Policy.dt(run.scenario["decision_time_utc"])) <= 30 * 86400 do
      {:ok, advance(run, target)}
    else
      _ -> {:error, "time_must_move_forward_within_30_days"}
    end
  end

  def command(run, %{"type" => "schedule"}) do
    run = evaluate(run, "proposal_rechecked")

    case run.decision["proposal"] do
      nil ->
        {:error, "no_contact_proposal"}

      proposal ->
        contacts =
          Enum.map(run.contacts, fn c ->
            if c["contact_id"] == proposal["contact_id"] && c["status"] == "queued" do
              c
              |> Map.merge(proposal)
              |> Map.put("original_contact", c["original_contact"] || c)
            else
              c
            end
          end)

        {:ok,
         %{run | contacts: contacts}
         |> audit("contact_replaced", %{"proposal" => proposal, "result" => "queued_only"})
         |> evaluate("contact_coordination_complete")}
    end
  end

  def command(run, %{"type" => "handoff", "contact_id" => id} = command) when is_binary(id) do
    case Enum.find(run.contacts, &(&1["contact_id"] == id)) do
      nil ->
        {:error, "contact_not_found"}

      %{"status" => status} when status != "queued" ->
        {:ok,
         audit(run, "handoff_ignored", %{"reason" => "contact_already_final", "contact_id" => id})}

      contact ->
        {:ok,
         handoff(run, contact, command["delivery_result"] == "failed")
         |> evaluate("after_handoff")}
    end
  end

  def command(run, %{"type" => "set_stop", "stopped" => stopped}) when is_boolean(stopped) do
    {:ok,
     %{run | stopped: stopped}
     |> audit("stop_control_changed", %{"stopped" => stopped, "owner" => "Demo operator"})
     |> evaluate("stop_control_checked")}
  end

  def command(run, %{"type" => "patch_account", "patch" => patch}) when is_map(patch) do
    if valid_patch?(patch) do
      {:ok,
       put_patch(run, patch)
       |> audit("simulator_source_patch", %{"patch" => patch})
       |> evaluate("source_rechecked")}
    else
      {:error, "invalid_account_patch"}
    end
  end

  def command(run, %{"type" => "record_intent", "intent" => intent}) do
    if intent in Portal.intents() do
      {:ok,
       %{run | intent: intent}
       |> audit("consumer_intent_recorded", %{
         "intent" => intent,
         "source" => "explicit_consumer_choice"
       })
       |> evaluate("intent_evaluated")}
    else
      {:error, "invalid_consumer_intent"}
    end
  end

  def command(run, %{"type" => "match_preferences", "preferences" => preferences}) do
    with :ok <- Portal.validate_preferences(preferences) do
      {:ok,
       %{
         run
         | preferences: preferences,
           intent: "payday_preference",
           conversation: Map.put(run.conversation, "preferences", preferences)
       }
       |> audit("preferences_recorded", %{
         "preferences" => preferences,
         "source" => "explicit_consumer_choice"
       })
       |> evaluate("preferences_evaluated")}
    end
  end

  def command(run, %{"type" => "request_help"}) do
    request = %{
      "id" => "help-#{length(run.support_requests) + 1}",
      "created_at_utc" => Policy.iso(run.now),
      "intent" => run.intent || "request_help",
      "preferences" => run.preferences,
      "status" => "logged",
      "message" =>
        "Request logged for weekday business hours. An immediate reply is not promised."
    }

    {:ok,
     %{
       run
       | support_requests: run.support_requests ++ [request],
         intent: "request_help",
         conversation: Map.put(run.conversation, "escalation_pending", true)
     }
     |> Conversation.outcome("request_help")
     |> audit("help_request_logged", request)
     |> evaluate("assistance_route_checked")}
  end

  def command(
        run,
        %{
          "type" => "confirm_plan",
          "option_id" => id,
          "confirmed" => true,
          "review_token" => token
        } = command
      ) do
    current = account(run)
    portal = portal(run)
    option = Enum.find(portal["options"], &(&1["id"] == id && &1["matches"]))
    method = PaymentMethods.find(run, Map.get(command, "payment_method_id", "demo_card_4242"))

    cond do
      is_nil(method) ->
        {:error, "eligible_demo_payment_method_required"}

      run.conversation["draft"] && run.conversation["draft"]["option_id"] == id &&
          (run.conversation["draft"]["status"] == "invalid" ||
             DateTime.compare(Policy.dt(run.conversation["draft"]["expires_at_utc"]), run.now) !=
               :gt) ->
        {:error, "draft_expired_or_invalid_select_and_save_again"}

      run.conversation["escalation_pending"] ->
        {:error, "human_review_required_before_plan"}

      !Portal.available?(current) ->
        {:error, "account_not_available_for_plan"}

      is_nil(option) ->
        {:error, "approved_matching_option_required"}

      token != portal["review_token"] ->
        {:error, "review_changed_options_before_confirming"}

      option["total_usd"] != current["balance_usd"] ->
        {:error, "option_balance_mismatch"}

      true ->
        plan =
          Map.drop(option, ["matches", "reason_codes"])
          |> Map.put("confirmed_at_utc", Policy.iso(run.now))
          |> Map.put("simulated", true)
          |> Map.put("payment_method_id", method["id"])
          |> Map.put("payment_method_label", method["label"])

        {:ok,
         %{put_patch(run, %{"plan_status" => "active"}) | confirmed_plan: plan}
         |> Conversation.outcome("confirm_plan")
         |> audit("plan_explicitly_confirmed", %{"option" => plan, "no_debit" => true})
         |> evaluate("plan_status_checked")}
    end
  end

  def command(_run, %{"type" => "confirm_plan"}),
    do: {:error, "explicit_confirmation_and_review_required"}

  def command(
        run,
        %{"type" => "simulate_payment", "confirmed" => true, "amount_usd" => amount} = command
      )
      when is_number(amount) do
    current = account(run)
    method = PaymentMethods.find(run, Map.get(command, "payment_method_id", "demo_card_4242"))

    if method && !run.conversation["escalation_pending"] && Portal.available?(current) &&
         amount > 0 &&
         amount <= current["balance_usd"] do
      payment = %{
        "amount_usd" => amount,
        "payment_method_id" => method["id"],
        "payment_method_label" => method["label"],
        "status" => "pending",
        "simulated" => true,
        "initiated_at_utc" => Policy.iso(run.now)
      }

      {:ok,
       %{put_patch(run, %{"payment_status" => "pending"}) | payment: payment}
       |> Conversation.outcome("simulate_payment")
       |> audit("payment_initiated_simulation", payment)
       |> evaluate("payment_status_checked")}
    else
      {:error, "payment_unavailable_or_amount_invalid"}
    end
  end

  def command(run, %{"type" => "add_demo_payment_method"}) do
    method = PaymentMethods.example("demo_card_1881")
    methods = Enum.uniq_by(run.payment_methods ++ [method], & &1["id"])

    {:ok,
     %{run | payment_methods: methods}
     |> audit("demo_payment_method_added", %{
       "method_id" => method["id"],
       "credentials_collected" => false
     })}
  end

  def command(run, %{"type" => "setup_demo_active_plan"}) do
    current = account(run)

    option =
      Enum.find(
        portal(%{run | preferences: %{}})["options"],
        &(&1["id"] == "monthly-160" && &1["matches"])
      )

    if current["payment_status"] == "none" && current["holds"] == [] &&
         !run.conversation["escalation_pending"] && option &&
         option["total_usd"] == current["balance_usd"] do
      method = hd(run.payment_methods)

      plan =
        option
        |> Map.drop(["matches", "reason_codes"])
        |> Map.merge(%{
          "simulated" => true,
          "fixture_setup" => true,
          "payment_method_id" => method["id"],
          "payment_method_label" => method["label"]
        })

      {:ok,
       %{put_patch(run, %{"plan_status" => "active"}) | confirmed_plan: plan}
       |> audit("active_plan_fixture_loaded", %{
         "operator_control" => true,
         "source" => "invented approved monthly example",
         "no_agreement_or_debit" => true
       })
       |> evaluate("operator_fixture_checked")}
    else
      {:error, "reset_to_compatible_account_before_loading_active_plan_fixture"}
    end
  end

  def command(run, %{"type" => "request_plan_change", "change_type" => kind} = command) do
    current = account(run)
    requested_date = command["requested_date"]
    requested_frequency = command["requested_frequency"]

    valid_value =
      case kind do
        "date" ->
          is_binary(requested_date) &&
            case Date.from_iso8601(requested_date) do
              {:ok, date} ->
                Date.compare(date, DateTime.to_date(run.now)) != :lt &&
                  run.confirmed_plan && requested_date != run.confirmed_plan["first_payment_date"]

              _ ->
                false
            end

        "frequency" ->
          requested_frequency in ~w(weekly fortnightly monthly) &&
            run.confirmed_plan && requested_frequency != run.confirmed_plan["frequency"]

        _ ->
          false
      end

    if valid_value && current["plan_status"] == "active" && run.confirmed_plan &&
         current["payment_status"] == "none" && current["holds"] == [] &&
         !run.conversation["escalation_pending"] do
      request = %{
        "id" => "change-#{length(run.support_requests) + 1}",
        "kind" => "plan_change",
        "change_type" => kind,
        "requested_date" => requested_date,
        "requested_frequency" => requested_frequency,
        "status" => "requested",
        "created_at_utc" => Policy.iso(run.now),
        "message" =>
          "Request recorded for team review. Existing plan terms remain in place; approval and an immediate response are not promised."
      }

      {:ok,
       %{run | support_requests: run.support_requests ++ [request]}
       |> Conversation.outcome("request_#{kind}_change")
       |> audit("plan_change_requested", Map.put(request, "schedule_unchanged", true))
       |> evaluate("plan_change_request_checked")}
    else
      {:error, "active_plan_and_valid_change_request_required"}
    end
  end

  def command(run, %{
        "type" => "simulate_early_payoff",
        "confirmed" => true,
        "reviewed_balance_usd" => reviewed,
        "payment_method_id" => method_id
      }) do
    current = account(run)
    method = PaymentMethods.find(run, method_id)

    if is_number(reviewed) && reviewed > 0 && reviewed == current["balance_usd"] && method &&
         current["payment_status"] == "none" &&
         current["plan_status"] in ["none", "started", "active"] &&
         current["holds"] == [] && !run.conversation["escalation_pending"] do
      payment = %{
        "amount_usd" => reviewed,
        "status" => "pending",
        "simulated" => true,
        "purpose" => "early_payoff",
        "payment_method_id" => method["id"],
        "payment_method_label" => method["label"],
        "initiated_at_utc" => Policy.iso(run.now)
      }

      {:ok,
       %{put_patch(run, %{"payment_status" => "pending"}) | payment: payment}
       |> Conversation.outcome("simulate_early_payoff")
       |> audit(
         "early_payoff_initiated_simulation",
         Map.put(payment, "plan_schedule_unchanged", true)
       )
       |> evaluate("payment_status_checked")}
    else
      {:error, "fresh_balance_and_available_account_and_method_required"}
    end
  end

  def command(run, %{"type" => "resolve_support_review"}) do
    {:ok,
     %{run | intent: nil, conversation: Map.put(run.conversation, "escalation_pending", false)}
     |> audit("human_review_resolution_simulated", %{
       "operator_control" => true,
       "account_holds_unchanged" => true
     })
     |> evaluate("human_review_resolution_checked")}
  end

  def command(run, %{"type" => "exhaust_contact_budget"}) do
    attempt = %{
      "attempt_id" => "operator-budget-#{run.revision}",
      "channel" => "email",
      "attempted_at_utc" => Policy.iso(DateTime.add(run.now, -60)),
      "delivery_result" => "simulated_success"
    }

    {:ok,
     %{run | history: run.history ++ [attempt]}
     |> audit("contact_budget_exhausted_simulation", %{
       "attempt" => attempt,
       "operator_control" => true
     })
     |> evaluate("synthetic_recent_attempt_checked")}
  end

  def command(run, %{"type" => "receive_sms", "text" => text}) do
    with {:ok, next} <- Conversation.receive(run, text) do
      {:ok,
       next
       |> audit("inbound_sms_evaluated", %{"decision" => next.conversation["decision"]})
       |> evaluate("conversation_policy_checked")}
    end
  end

  def command(run, %{"type" => "create_jit", "state" => state}) do
    with {:ok, next, action} <- Conversation.create_jit(run, state) do
      {:ok, audit(next, "jit_action_created", %{"action_id" => action["id"], "state" => state})}
    end
  end

  def command(run, %{"type" => "save_draft", "option_id" => id} = command) do
    current_portal = portal(run)
    option = Enum.find(current_portal["options"], &(&1["id"] == id && &1["matches"]))

    previous = run.conversation["draft"]
    step = Map.get(command, "step", (previous && previous["step"]) || "options")
    method_id = Map.get(command, "payment_method_id", previous && previous["payment_method_id"])
    method_valid = is_nil(method_id) || PaymentMethods.find(run, method_id)

    if step in ~w(options schedule method review) && method_valid &&
         !run.conversation["escalation_pending"] && Portal.available?(account(run)) && option &&
         option["total_usd"] == account(run)["balance_usd"] do
      draft = %{
        "id" =>
          (previous && previous["id"]) ||
            "draft-" <> Base.url_encode64(:crypto.strong_rand_bytes(12), padding: false),
        "created_at_utc" => (previous && previous["created_at_utc"]) || Policy.iso(run.now),
        "updated_at_utc" => Policy.iso(run.now),
        "step" => step,
        "payment_method_id" => method_id,
        "option_id" => id,
        "status" => "saved",
        "saved_at_utc" => Policy.iso(run.now),
        "expires_at_utc" => Policy.iso(DateTime.add(run.now, 86400)),
        "preferences" => run.preferences,
        "approved_terms" => Map.drop(option, ["matches", "reason_codes"])
      }

      {:ok,
       %{run | conversation: Map.put(run.conversation, "draft", draft)}
       |> Conversation.outcome("save_draft")
       |> audit("draft_saved", %{"draft_id" => draft["id"], "no_agreement_or_debit" => true})}
    else
      {:error, "approved_matching_option_and_available_account_required"}
    end
  end

  def command(run, %{"type" => "resume_draft"}) do
    draft = run.conversation["draft"]

    cond do
      is_nil(draft) ->
        {:error, "no_saved_draft"}

      draft["status"] not in ["saved", "resumed"] ->
        {:error, "draft_not_resumable"}

      DateTime.compare(Policy.dt(draft["expires_at_utc"]), run.now) != :gt ->
        {:ok, invalidate_draft(run, "expired")}

      run.conversation["escalation_pending"] ->
        {:ok, invalidate_draft(run, "human_review_required")}

      !Portal.available?(account(run)) ->
        {:ok, invalidate_draft(run, "account_changed")}

      true ->
        restored = %{run | preferences: draft["preferences"]}

        option =
          Enum.find(
            portal(restored)["options"],
            &(&1["id"] == draft["option_id"] && &1["matches"])
          )

        if option && Map.drop(option, ["matches", "reason_codes"]) == draft["approved_terms"] &&
             option["total_usd"] == account(run)["balance_usd"] do
          {:ok,
           %{
             restored
             | conversation:
                 Map.put(restored.conversation, "draft", Map.put(draft, "status", "resumed"))
           }
           |> Conversation.outcome("resume_draft")
           |> audit("draft_resumed", %{
             "draft_id" => draft["id"],
             "fresh_account_and_terms_checked" => true
           })}
        else
          {:ok, invalidate_draft(run, "approved_terms_changed")}
        end
    end
  end

  def command(run, %{"type" => "expire_draft"}) do
    case run.conversation["draft"] do
      nil ->
        {:error, "no_saved_draft"}

      draft ->
        {:ok,
         %{
           run
           | conversation:
               Map.put(
                 run.conversation,
                 "draft",
                 Map.put(draft, "expires_at_utc", Policy.iso(DateTime.add(run.now, -1)))
               )
         }
         |> audit("draft_expiry_simulated", %{"operator_control" => true})}
    end
  end

  def command(_, _), do: {:error, "unknown_or_invalid_command"}

  defp invalidate_draft(run, reason),
    do:
      %{
        run
        | conversation:
            Map.put(
              run.conversation,
              "draft",
              Map.merge(run.conversation["draft"], %{
                "status" => "invalid",
                "invalid_reason" => reason
              })
            )
      }
      |> audit("draft_invalidated", %{
        "reason" => reason,
        "recovery" => "select_current_approved_options"
      })

  def advance(run, target) do
    milestones =
      Enum.map(run.scenario["subsequent_updates"], &Policy.dt(&1["effective_at_utc"])) ++
        Enum.map(all_events(run), &Policy.dt(&1["ingested_at_utc"])) ++
        (run.contacts
         |> Enum.filter(&(&1["status"] == "queued"))
         |> Enum.map(&Policy.dt(&1["scheduled_at_utc"]))) ++ [target]

    next =
      milestones
      |> Enum.filter(
        &(DateTime.compare(&1, run.now) == :gt && DateTime.compare(&1, target) != :gt)
      )
      |> Enum.min(DateTime, fn -> nil end)

    if next do
      previous = account(run)
      state = %{run | now: next}
      current = account(state)

      state =
        if current != previous,
          do:
            audit(state, "authoritative_source_changed", %{
              "account" => current,
              "notification_may_lag" => true
            }),
          else: state

      state = ingest(state)

      due =
        Enum.filter(
          state.contacts,
          &(&1["status"] == "queued" &&
              DateTime.compare(Policy.dt(&1["scheduled_at_utc"]), next) != :gt)
        )

      state = Enum.reduce(due, state, fn contact, acc -> handoff(acc, contact, false) end)
      state |> evaluate("replay_evaluation") |> advance(target)
    else
      run
    end
  end

  def account(run) do
    fixture_patches =
      Enum.map(
        run.scenario["subsequent_updates"],
        &{Policy.dt(&1["effective_at_utc"]), 0, &1["state_patch"]}
      )

    patches =
      fixture_patches ++
        Enum.with_index(run.local_updates, fn patch, i -> {patch.at, i + 1, patch.changes} end)

    patches
    |> Enum.filter(fn {at, _, _} -> DateTime.compare(at, run.now) != :gt end)
    |> Enum.sort_by(fn {at, order, _} -> {DateTime.to_unix(at, :microsecond), order} end)
    |> Enum.reduce(run.scenario["state_at_decision"], fn {_, _, patch}, state ->
      Map.merge(state, patch)
    end)
  end

  def view(run) do
    %{
      "conversation" => run.conversation,
      "session_id" => run.id,
      "scenario_id" => run.scenario["scenario_id"],
      "consumer_id" => run.scenario["consumer_id"],
      "now_utc" => Policy.iso(run.now),
      "initial_time_utc" => run.scenario["decision_time_utc"],
      "revision" => run.revision,
      "account" => account(run),
      "intent" => run.intent,
      "preferences" => run.preferences,
      "events" => visible_events(run),
      "contacts" => run.contacts,
      "original_contacts" => run.scenario["queued_contacts"],
      "contact_history" => run.history,
      "decision" => run.decision,
      "audit" => Enum.take(run.audit, -150),
      "stopped" => run.stopped,
      "portal" => portal(run),
      "support_requests" => run.support_requests,
      "plan_change_requests" => Enum.filter(run.support_requests, &(&1["kind"] == "plan_change")),
      "confirmed_plan" => run.confirmed_plan,
      "payment" => run.payment,
      "experiment" => %{
        "assigned_arm" => assignment(run.scenario["consumer_id"]),
        "preview_arm" => run.arm,
        "unit" => "consumer",
        "assigned_at_utc" => run.scenario["decision_time_utc"],
        "preview_is_counterfactual" => true
      },
      "message" => message(run.decision),
      "synthetic" => true
    }
  end

  def portal(run) do
    plans = Fixtures.plans()
    account = account(run)

    options =
      plans["options"]
      |> Enum.map(fn option ->
        AdaptiveResolution.match_approved_option!(
          option["id"],
          run.preferences,
          run.now,
          account["balance_usd"],
          actor: %{role: :portal, simulation: true}
        )
        |> ApprovedPlanOption.to_map()
      end)

    token =
      :crypto.hash(:sha256, :erlang.term_to_binary({account, options, run.preferences}))
      |> Base.encode16(case: :lower)

    %{
      "payment_methods" => run.payment_methods,
      "creditor_display_name" => plans["creditor_display_name"],
      "fixture_source" => plans["source"],
      "options" => options,
      "can_confirm" =>
        !run.conversation["escalation_pending"] && Portal.available?(account) &&
          Enum.any?(options, & &1["matches"]),
      "review_token" => token,
      "matching_rule" =>
        "Same selected frequency, first payment on or within six days after stated payday, and instalment at or below the stated amount. Preferences are optional; these checks do not establish affordability."
    }
  end

  def assignment(consumer_id) do
    <<first, _::binary>> = :crypto.hash(:sha256, "adaptive-resolution-v1:" <> consumer_id)
    if rem(first, 2) == 0, do: "treatment", else: "control"
  end

  defp evaluate(run, event) do
    decision =
      AdaptiveResolution.evaluate_journey!(
        account(run),
        visible_events(run),
        run.intent,
        run.contacts,
        run.history,
        run.now,
        %{"stopped" => run.stopped, "arm" => run.arm},
        actor: %{role: :journey_engine, simulation: true}
      )
      |> JourneyDecision.to_map()

    %{run | decision: decision}
    |> audit(event, %{
      "decision" => decision,
      "inputs" => %{
        "account" => account(run),
        "intent" => run.intent,
        "preferences" => run.preferences,
        "contact_history" => run.history,
        "contacts" => run.contacts,
        "settings" => %{"stopped" => run.stopped, "arm" => run.arm},
        "visible_events" => visible_events(run),
        "visible_event_ids" => Enum.map(visible_events(run), & &1["event_id"])
      }
    })
  end

  defp handoff(run, contact, failed?) do
    current = account(run)

    reasons =
      Policy.handoff_reasons(current, contact["channel"], run.history, run.now, %{
        "stopped" => run.stopped && contact["pilot"] == true
      })

    reasons =
      if run.conversation["escalation_pending"],
        do: reasons ++ ["consumer_requested_pause"],
        else: reasons

    reasons =
      if contact["pilot"] == true &&
           run.intent in ~w(review_later balance_question affordability_concern request_help),
         do: reasons ++ ["consumer_requested_pause"],
         else: reasons

    cond do
      reasons != [] ->
        hard =
          Policy.restrictions(current, %{"stopped" => run.stopped && contact["pilot"] == true})

        channel_denied = current[contact["channel"] <> "_allowed"] != true

        if hard != [] || channel_denied || "consumer_requested_pause" in reasons do
          set_contact(run, contact, "suppressed")
          |> audit("contact_suppressed", %{
            "contact_id" => contact["contact_id"],
            "reason_codes" => reasons,
            "account_at_handoff" => current,
            "provider_handoff" => false
          })
        else
          next = Policy.next_permitted(current, run.history, run.now)

          if next do
            replacement = Map.put(contact, "scheduled_at_utc", Policy.iso(next))

            %{
              run
              | contacts:
                  Enum.map(run.contacts, fn c ->
                    if c["contact_id"] == contact["contact_id"], do: replacement, else: c
                  end)
            }
            |> audit("contact_deferred", %{
              "contact_id" => contact["contact_id"],
              "reason_codes" => reasons,
              "next_time_utc" => Policy.iso(next)
            })
          else
            set_contact(run, contact, "suppressed")
          end
        end

      DateTime.compare(run.now, Policy.dt(contact["scheduled_at_utc"])) == :lt ->
        audit(run, "handoff_deferred", %{
          "contact_id" => contact["contact_id"],
          "reason_codes" => ["contact_not_due"],
          "provider_handoff" => false
        })

      true ->
        attempt = %{
          "attempt_id" => "demo-" <> contact["contact_id"],
          "channel" => contact["channel"],
          "attempted_at_utc" => Policy.iso(run.now),
          "delivery_result" => if(failed?, do: "failed", else: "simulated_success")
        }

        run = set_contact(run, contact, "handed_off")

        %{run | history: run.history ++ [attempt]}
        |> audit("provider_handoff_simulated", %{
          "attempt" => attempt,
          "template_id" => contact["template_id"],
          "disclosure_version" => "exercise-placeholder-v1",
          "model_versions" => nil,
          "account_at_handoff" => current,
          "irreversible" => true
        })
    end
  end

  defp ingest(run) do
    deliveries =
      all_events(run)
      |> Enum.filter(&(DateTime.compare(Policy.dt(&1["ingested_at_utc"]), run.now) != :gt))
      |> Enum.sort_by(& &1["ingested_at_utc"])

    Enum.reduce(deliveries, run, fn e, state ->
      key = {e["event_id"], e["ingested_at_utc"]}

      cond do
        MapSet.member?(state.seen_deliveries, key) ->
          state

        MapSet.member?(state.seen_events, e["event_id"]) ->
          %{state | seen_deliveries: MapSet.put(state.seen_deliveries, key)}
          |> audit("duplicate_event_ignored", %{"event_id" => e["event_id"]})

        true ->
          %{
            state
            | seen_deliveries: MapSet.put(state.seen_deliveries, key),
              seen_events: MapSet.put(state.seen_events, e["event_id"])
          }
          |> audit("event_received", %{"event" => e})
      end
    end)
  end

  defp all_events(run),
    do:
      run.scenario["incoming_events"] ++
        Enum.map(run.scenario["subsequent_updates"], & &1["event"])

  defp visible_events(run),
    do:
      all_events(run)
      |> Enum.filter(&(DateTime.compare(Policy.dt(&1["ingested_at_utc"]), run.now) != :gt))
      |> Enum.sort_by(& &1["ingested_at_utc"])
      |> Enum.uniq_by(& &1["event_id"])

  defp put_patch(run, patch),
    do: %{run | local_updates: run.local_updates ++ [%{at: run.now, changes: patch}]}

  defp set_contact(run, contact, status),
    do: %{
      run
      | contacts:
          Enum.map(run.contacts, fn c ->
            if c["contact_id"] == contact["contact_id"], do: Map.put(c, "status", status), else: c
          end)
    }

  defp audit(run, event, details),
    do: %{
      run
      | audit:
          Enum.take(
            run.audit ++
              [
                %{
                  "sequence" =>
                    if(run.audit == [], do: 1, else: List.last(run.audit)["sequence"] + 1),
                  "at_utc" => Policy.iso(run.now),
                  "event" => event,
                  "details" => details,
                  "policy_version" => "pilot-policy-v1",
                  "simulated" => true
                }
              ],
            -500
          )
    }

  defp message(decision) do
    template = get_in(decision, ["proposal", "template_id"])

    body =
      case template do
        "plan_options_v1" ->
          "You can review the payment options available in your secure portal. You choose whether to continue, and you can ask our team for help."

        "next_step_v1" ->
          "You can review your account options or ask our team a question in your secure portal."

        _ ->
          "You can review your account and available options in your secure portal. If you need help, you can contact our team."
      end

    %{
      "subject" => "Your account options",
      "body" => body,
      "template_id" => template || "account_options_v1",
      "disclosure_label" => "Fixed disclosure and opt-out block",
      "disclosure_version" => "exercise-placeholder-v1",
      "disclosure_text" => "Placeholder only. Legal wording was not supplied.",
      "approval" => "Synthetic template; real pilot requires human compliance approval.",
      "destination" => "authenticated_next_step",
      "ai_generated" => false
    }
  end

  defp valid_patch?(patch) do
    Enum.all?(patch, fn {key, value} ->
      key in @patch_keys &&
        case key do
          k when k in ~w(pilot_scope_allowed email_allowed sms_allowed) ->
            is_nil(value) || is_boolean(value)

          "balance_usd" ->
            is_nil(value) || (is_number(value) && value >= 0 && value <= 1_000_000)

          "language" ->
            is_nil(value) || value in ~w(en fr ar es)

          "timezone" ->
            is_nil(value) ||
              (is_binary(value) &&
                 match?(
                   {:ok, _},
                   DateTime.shift_zone(~U[2026-09-16 14:00:00Z], value, Tzdata.TimeZoneDatabase)
                 ))

          "payment_status" ->
            value in [nil, "none", "pending", "settled"]

          "plan_status" ->
            value in [nil, "none", "started", "active"]

          "holds" ->
            is_nil(value) ||
              (is_list(value) && length(value) <= 10 &&
                 Enum.all?(value, &(is_binary(&1) && byte_size(&1) < 80)))

          "contact_window_override" ->
            is_nil(value) || (is_map(value) && map_size(value) <= 3)
        end
    end)
  end
end
