defmodule RecoveryApi.AdaptiveResolution.Changes.MatchApprovedOption do
  use Ash.Resource.Change
  alias RecoveryApi.{Fixtures, Portal}

  @impl true
  def change(changeset, _, _) do
    a = changeset.arguments
    option = Enum.find(Fixtures.plans()["options"], &(&1["id"] == a.option_id))

    with :ok <- Portal.validate_preferences(a.preferences),
         true <- not is_nil(option) do
      [result] = Portal.match([option], a.preferences, a.now)

      result =
        if result["total_usd"] == a.balance_usd,
          do: result,
          else:
            result
            |> Map.put("matches", false)
            |> Map.update!("reason_codes", &(&1 ++ ["option_balance_mismatch"]))

      attributes =
        Map.new(result, fn
          {"frequency", value} -> {:frequency, String.to_existing_atom(value)}
          {"first_payment_date", value} -> {:first_payment_date, Date.from_iso8601!(value)}
          {"last_payment_date", value} -> {:last_payment_date, Date.from_iso8601!(value)}
          {key, value} -> {String.to_existing_atom(key), value}
        end)

      Ash.Changeset.force_change_attributes(changeset, attributes)
    else
      {:error, reason} ->
        Ash.Changeset.add_error(changeset, field: :preferences, message: reason)

      false ->
        Ash.Changeset.add_error(changeset,
          field: :option_id,
          message: "approved_option_not_found"
        )
    end
  end
end
