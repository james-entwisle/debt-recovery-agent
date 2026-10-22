defmodule IndebtedApi.Portal do
  @moduledoc "Matches stated preferences to fixed synthetic options, never creates terms."
  @intents ~w(explore_payment explore_plan payday_preference balance_question affordability_concern request_help review_later)
  def intents, do: @intents

  def match(options, preferences, now) do
    today = DateTime.to_date(now)

    Enum.map(options, fn option ->
      first = Date.from_iso8601!(option["first_payment_date"])
      reasons = []

      reasons =
        if Date.compare(first, today) == :lt,
          do: ["first_payment_in_past" | reasons],
          else: reasons

      frequency = preferences["frequency"]

      reasons =
        if frequency && frequency != "any" && frequency != option["frequency"],
          do: ["frequency_differs" | reasons],
          else: reasons

      payday = preferences["payday"]

      reasons =
        if payday && payday != "" do
          date = Date.from_iso8601!(payday)
          difference = Date.diff(first, date)
          if difference in 0..6, do: reasons, else: ["outside_payday_window" | reasons]
        else
          reasons
        end

      max_amount = preferences["max_instalment_usd"]

      reasons =
        if is_number(max_amount) && option["instalment_usd"] > max_amount,
          do: ["above_stated_amount" | reasons],
          else: reasons

      schedule =
        for index <- 0..(option["instalments"] - 1) do
          date =
            case option["frequency"] do
              "weekly" -> Date.add(first, index * 7)
              "fortnightly" -> Date.add(first, index * 14)
              "monthly" -> Date.shift(first, month: index)
            end

          %{"date" => Date.to_iso8601(date), "amount_usd" => option["instalment_usd"]}
        end

      Map.merge(option, %{
        "matches" => reasons == [],
        "reason_codes" => Enum.reverse(reasons),
        "payment_schedule" => schedule,
        "last_payment_date" => List.last(schedule)["date"]
      })
    end)
  end

  def available?(account) do
    is_number(account["balance_usd"]) && account["balance_usd"] > 0 &&
      account["payment_status"] == "none" && account["plan_status"] in ["none", "started"] &&
      account["holds"] == []
  end

  def validate_preferences(prefs) when is_map(prefs) do
    known = Enum.all?(Map.keys(prefs), &(&1 in ~w(frequency payday max_instalment_usd)))
    frequency = prefs["frequency"]
    amount = prefs["max_instalment_usd"]
    date = prefs["payday"]

    valid_date =
      is_nil(date) || date == "" || (is_binary(date) && match?({:ok, _}, Date.from_iso8601(date)))

    if known && frequency in [nil, "any", "weekly", "fortnightly", "monthly"] &&
         (is_nil(amount) || (is_number(amount) && amount > 0 && amount <= 1_000_000)) &&
         valid_date, do: :ok, else: {:error, "invalid_preferences"}
  end

  def validate_preferences(_), do: {:error, "invalid_preferences"}
end
