defmodule IndebtedApi.Policy do
  @moduledoc "Deterministic outreach policy. This module has no access to future replay fixtures."
  @wait_seconds 2700
  @engagement ~w(message_click portal_visit plan_started)
  @rank %{"message_click" => 1, "portal_visit" => 2, "plan_started" => 3}
  @required ~w(balance_usd pilot_scope_allowed language payment_status plan_status holds email_allowed sms_allowed timezone)

  def evaluate(account, events, intent, contacts, history, now, settings \\ %{}) do
    reasons = restrictions(account, settings)

    queued =
      contacts
      |> Enum.filter(&(&1["status"] == "queued"))
      |> Enum.sort_by(& &1["scheduled_at_utc"])
      |> List.first()

    visible =
      events
      |> Enum.filter(fn e ->
        age = DateTime.diff(now, dt(e["occurred_at_utc"]), :microsecond)

        e["type"] in @engagement && age in 0..86_400_000_000 &&
          DateTime.compare(dt(e["ingested_at_utc"]), now) != :gt
      end)
      |> Enum.uniq_by(& &1["event_id"])

    trigger = Enum.max_by(visible, &{@rank[&1["type"]], &1["occurred_at_utc"]}, fn -> nil end)
    context = context(trigger, intent)

    base = %{
      "outcome" => "NO_ACTION",
      "reason_codes" => [],
      "proposal" => nil,
      "consumer_context" => context,
      "evaluated_at_utc" => iso(now),
      "policy_version" => "pilot-policy-v1",
      "evidence_event_ids" => Enum.map(visible, & &1["event_id"]),
      "eligibility" => checks(account, history, now, settings),
      "executed" => false
    }

    cond do
      reasons != [] ->
        Map.merge(base, %{"outcome" => "SUPPRESS", "reason_codes" => reasons})

      intent in ~w(balance_question affordability_concern request_help) ->
        Map.merge(base, %{
          "outcome" => "ROUTE_TO_SUPPORT",
          "reason_codes" => ["consumer_requested_assistance", "no_automated_payment_pressure"]
        })

      intent == "review_later" ->
        Map.merge(base, %{
          "outcome" => "NO_ACTION",
          "reason_codes" => ["consumer_chose_review_later", "no_additional_reminder"]
        })

      settings["arm"] == "control" ->
        Map.put(base, "reason_codes", ["control_existing_journey"])

      is_nil(trigger) && is_nil(intent) ->
        Map.put(base, "reason_codes", ["no_qualifying_engagement"])

      is_nil(queued) ->
        Map.merge(base, %{
          "outcome" => "ADAPT_PORTAL",
          "reason_codes" => ["no_queued_contact", "do_not_add_contact"]
        })

      true ->
        channel = choose_channel(account, queued["channel"])

        threshold =
          if trigger, do: DateTime.add(dt(trigger["occurred_at_utc"]), @wait_seconds), else: now

        start = Enum.max([now, threshold], DateTime)

        send_at = next_permitted(account, history, start)

        if send_at do
          delayed = DateTime.compare(send_at, dt(queued["scheduled_at_utc"])) == :gt
          waiting = DateTime.compare(now, threshold) == :lt

          proposal = %{
            "contact_id" => queued["contact_id"],
            "channel" => channel,
            "scheduled_at_utc" => iso(send_at),
            "template_id" => template(context),
            "original_template_id" => queued["original_template_id"] || queued["template_id"],
            "original_scheduled_at_utc" =>
              queued["original_scheduled_at_utc"] || queued["scheduled_at_utc"],
            "action" => "replace_same_contact",
            "context" => context,
            "pilot" => true
          }

          outcome =
            cond do
              waiting -> "DEFER"
              delayed -> "RESCHEDULE"
              true -> "REPLACE_CONTACT"
            end

          reason =
            cond do
              waiting -> "waiting_for_consumer_progress"
              delayed -> "move_to_permitted_time"
              true -> "replace_existing_contact_no_extra_attempt"
            end

          Map.merge(base, %{
            "outcome" => outcome,
            "reason_codes" => [reason, "send_time_recheck_required"],
            "proposal" => proposal
          })
        else
          Map.merge(base, %{"outcome" => "SUPPRESS", "reason_codes" => ["no_permitted_time"]})
        end
    end
  end

  def restrictions(account, settings \\ %{}) do
    []
    |> add(settings["stopped"] == true, "pilot_stopped")
    |> add(Enum.any?(@required, &is_nil(account[&1])), "required_state_unknown")
    |> add(account["pilot_scope_allowed"] != true, "outside_pilot_scope")
    |> add(account["language"] != "en", "language_not_supported")
    |> add(
      !is_number(account["balance_usd"]) || account["balance_usd"] <= 0,
      "no_positive_balance"
    )
    |> add(account["payment_status"] not in ["none"], "payment_pending_or_settled")
    |> add(account["plan_status"] not in ["none", "started"], "plan_active_or_unknown")
    |> add(account["holds"] != [], "account_hold_or_unknown")
    |> add(
      account["email_allowed"] != true && account["sms_allowed"] != true,
      "no_permitted_channel"
    )
    |> add(!valid_timezone?(account["timezone"]), "timezone_unknown_or_invalid")
    |> add(
      !valid_override?(account["contact_window_override"]),
      "contact_preference_unknown_or_invalid"
    )
  end

  def handoff_reasons(account, channel, history, now, settings \\ %{}) do
    restrictions(account, settings)
    |> add(account[channel <> "_allowed"] != true, "channel_permission_denied")
    |> add(!in_window?(account, now), "outside_contact_window")
    |> add(count(history, now, 86400) >= 1, "rolling_24h_limit")
    |> add(count(history, now, 604_800) >= 3, "rolling_7d_limit")
  end

  def checks(account, history, now, settings) do
    reasons = restrictions(account, settings)

    %{
      "source_eligible" => reasons == [],
      "restriction_reasons" => reasons,
      "local_time" => local_iso(account["timezone"], now),
      "in_contact_window" => in_window?(account, now),
      "attempts_24h" => count(history, now, 86400),
      "attempts_7d" => count(history, now, 604_800),
      "email_allowed" => account["email_allowed"],
      "sms_allowed" => account["sms_allowed"]
    }
  end

  def next_permitted(account, history, start) do
    candidate = budget_floor(history, start)
    find_window(account, candidate, 0)
  end

  defp budget_floor(history, start) do
    recent =
      budget_attempts(history)
      |> Enum.map(&dt(&1["attempted_at_utc"]))
      |> Enum.filter(&(DateTime.compare(&1, start) != :gt))
      |> Enum.sort({:desc, DateTime})

    day = Enum.filter(recent, &(DateTime.diff(start, &1, :microsecond) <= 86_400_000_000))
    week = Enum.filter(recent, &(DateTime.diff(start, &1, :microsecond) <= 604_800_000_000))

    floors =
      [start] ++
        if(day != [], do: [DateTime.add(hd(day), 86401)], else: []) ++
        if length(week) >= 3, do: [DateTime.add(Enum.at(week, 2), 604_801)], else: []

    Enum.max(floors, DateTime)
  end

  defp find_window(_account, _time, count) when count > 20160, do: nil

  defp find_window(account, time, count) do
    if in_window?(account, time),
      do: time,
      else: find_window(account, DateTime.add(time, 60), count + 1)
  end

  def in_window?(account, now) do
    with timezone when is_binary(timezone) <- account["timezone"],
         {:ok, local} <- DateTime.shift_zone(now, timezone, Tzdata.TimeZoneDatabase),
         true <- valid_override?(account["contact_window_override"]) do
      override = account["contact_window_override"] || %{}
      first = max(9, Map.get(override, "start_hour", 9))
      last = min(18, Map.get(override, "end_hour", 18))
      days = Map.get(override, "weekdays", [1, 2, 3, 4, 5])

      Date.day_of_week(DateTime.to_date(local)) in days &&
        Date.day_of_week(DateTime.to_date(local)) <= 5 &&
        local.hour >= first && local.hour < last
    else
      _ -> false
    end
  end

  def count(history, now, seconds) do
    Enum.count(budget_attempts(history), fn attempt ->
      diff = DateTime.diff(now, dt(attempt["attempted_at_utc"]), :microsecond)
      diff >= 0 && diff <= seconds * 1_000_000
    end)
  end

  defp budget_attempts(history) do
    history
    |> Enum.reject(
      &(&1["transactional"] == true ||
          &1["kind"] in ~w(transactional_receipt requested_service_reply))
    )
    |> Enum.uniq_by(& &1["attempt_id"])
  end

  defp valid_timezone?(nil), do: false

  defp valid_timezone?(zone) when is_binary(zone),
    do:
      match?(
        {:ok, _},
        DateTime.shift_zone(~U[2026-09-16 14:00:00Z], zone, Tzdata.TimeZoneDatabase)
      )

  defp valid_timezone?(_), do: false
  defp valid_override?(nil), do: true

  defp valid_override?(o) when is_map(o) do
    Enum.all?(Map.keys(o), &(&1 in ~w(start_hour end_hour weekdays))) &&
      is_integer(Map.get(o, "start_hour", 9)) && is_integer(Map.get(o, "end_hour", 18)) &&
      Map.get(o, "start_hour", 9) >= 9 && Map.get(o, "end_hour", 18) <= 18 &&
      Map.get(o, "start_hour", 9) < Map.get(o, "end_hour", 18) &&
      is_list(Map.get(o, "weekdays", [1, 2, 3, 4, 5])) &&
      Map.get(o, "weekdays", [1, 2, 3, 4, 5]) != [] &&
      Enum.all?(Map.get(o, "weekdays", [1, 2, 3, 4, 5]), &(&1 in 1..5))
  end

  defp valid_override?(_), do: false

  defp choose_channel(account, preferred),
    do:
      if(account[preferred <> "_allowed"] == true,
        do: preferred,
        else: if(account["email_allowed"] == true, do: "email", else: "sms")
      )

  defp context(_trigger, intent) when intent in ~w(explore_plan payday_preference),
    do: "plan_options"

  defp context(_trigger, "explore_payment"), do: "account_options"
  defp context(nil, _), do: "account_options"
  defp context(%{"type" => "plan_started"}, _), do: "plan_options"
  defp context(%{"type" => "portal_visit"}, _), do: "next_step"
  defp context(_, _), do: "account_options"
  defp template("plan_options"), do: "plan_options_v1"
  defp template("next_step"), do: "next_step_v1"
  defp template(_), do: "account_options_v1"

  defp local_iso(zone, now) when is_binary(zone) do
    case DateTime.shift_zone(now, zone, Tzdata.TimeZoneDatabase) do
      {:ok, d} -> DateTime.to_iso8601(d)
      _ -> nil
    end
  end

  defp local_iso(_, _), do: nil
  defp add(list, true, reason), do: list ++ [reason]
  defp add(list, _, _), do: list
  def dt(value), do: value |> DateTime.from_iso8601() |> elem(1)
  def iso(time), do: DateTime.to_iso8601(time)
end
