defmodule IndebtedApi.AdaptiveResolution.ApprovedPlanOption do
  @moduledoc "Fixed synthetic creditor terms with a preference-matching action. No action creates new terms."
  use Ash.Resource,
    domain: IndebtedApi.AdaptiveResolution,
    data_layer: Ash.DataLayer.Simple,
    authorizers: [Ash.Policy.Authorizer]

  attributes do
    attribute(:id, :string, primary_key?: true, allow_nil?: false)
    attribute(:label, :string, allow_nil?: false)

    attribute(:frequency, :atom,
      allow_nil?: false,
      constraints: [one_of: [:weekly, :fortnightly, :monthly]]
    )

    attribute(:first_payment_date, :date, allow_nil?: false)
    attribute(:last_payment_date, :date, allow_nil?: false)
    attribute(:payment_schedule, {:array, :map}, allow_nil?: false)
    attribute(:instalment_usd, :integer, allow_nil?: false, constraints: [min: 1])
    attribute(:instalments, :integer, allow_nil?: false, constraints: [min: 1])
    attribute(:total_usd, :integer, allow_nil?: false, constraints: [min: 1])
    attribute(:matches, :boolean, allow_nil?: false)
    attribute(:reason_codes, {:array, :string}, allow_nil?: false)
  end

  actions do
    create :match_preferences do
      description(
        "Load a fixed approved fixture by ID and explain whether its existing terms fit stated preferences."
      )

      accept([])
      argument(:option_id, :string, allow_nil?: false)
      argument(:preferences, :map, default: %{})
      argument(:now, :utc_datetime_usec, allow_nil?: false)
      argument(:balance_usd, :float)
      change(IndebtedApi.AdaptiveResolution.Changes.MatchApprovedOption, only_when_valid?: true)
    end
  end

  policies do
    policy action(:match_preferences) do
      description(
        "Only the simulated portal may match terms; user input cannot supply or amend terms."
      )

      forbid_unless(actor_attribute_equals(:simulation, true))
      authorize_if(actor_attribute_equals(:role, :portal))
    end
  end

  def to_map(option) do
    option
    |> Map.take(
      ~w(id label frequency first_payment_date last_payment_date payment_schedule instalment_usd instalments total_usd matches reason_codes)a
    )
    |> Map.new(fn
      {:frequency, value} -> {"frequency", Atom.to_string(value)}
      {:first_payment_date, value} -> {"first_payment_date", Date.to_iso8601(value)}
      {:last_payment_date, value} -> {"last_payment_date", Date.to_iso8601(value)}
      {key, value} -> {Atom.to_string(key), value}
    end)
  end
end
