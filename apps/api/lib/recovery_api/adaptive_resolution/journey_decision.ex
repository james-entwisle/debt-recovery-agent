defmodule RecoveryApi.AdaptiveResolution.JourneyDecision do
  @moduledoc "An immutable, typed decision. The session owns its audit history, so no database is needed."
  use Ash.Resource,
    domain: RecoveryApi.AdaptiveResolution,
    data_layer: Ash.DataLayer.Simple,
    authorizers: [Ash.Policy.Authorizer]

  attributes do
    uuid_primary_key(:id)

    attribute(:outcome, :atom,
      allow_nil?: false,
      constraints: [
        one_of: [
          :ADAPT_PORTAL,
          :REPLACE_CONTACT,
          :RESCHEDULE,
          :DEFER,
          :SUPPRESS,
          :NO_ACTION,
          :ROUTE_TO_SUPPORT
        ]
      ]
    )

    attribute(:reason_codes, {:array, :string}, allow_nil?: false)
    attribute(:proposal, :map)
    attribute(:consumer_context, :string, allow_nil?: false)
    attribute(:evaluated_at_utc, :utc_datetime_usec, allow_nil?: false)
    attribute(:policy_version, :string, allow_nil?: false)
    attribute(:evidence_event_ids, {:array, :string}, allow_nil?: false)
    attribute(:eligibility, :map, allow_nil?: false)
    attribute(:executed, :boolean, default: false, allow_nil?: false)
  end

  actions do
    create :evaluate do
      description(
        "Evaluate current source state and visible events. Creates a proposal, never a provider handoff."
      )

      accept([])
      argument(:account, :map, allow_nil?: false)
      argument(:events, {:array, :map}, allow_nil?: false)
      argument(:intent, :string)
      argument(:contacts, {:array, :map}, allow_nil?: false)
      argument(:history, {:array, :map}, allow_nil?: false)
      argument(:now, :utc_datetime_usec, allow_nil?: false)
      argument(:settings, :map, default: %{})
      change(RecoveryApi.AdaptiveResolution.Changes.EvaluateJourney, only_when_valid?: true)
    end
  end

  policies do
    policy action(:evaluate) do
      description(
        "Only the local simulated journey engine can evaluate outreach. This is not production authentication."
      )

      forbid_unless(actor_attribute_equals(:simulation, true))
      authorize_if(actor_attribute_equals(:role, :journey_engine))
    end
  end

  def to_map(decision) do
    decision
    |> Map.take(
      ~w(outcome reason_codes proposal consumer_context evaluated_at_utc policy_version evidence_event_ids eligibility executed)a
    )
    |> Map.new(fn
      {:outcome, value} -> {"outcome", Atom.to_string(value)}
      {:evaluated_at_utc, value} -> {"evaluated_at_utc", DateTime.to_iso8601(value)}
      {key, value} -> {Atom.to_string(key), value}
    end)
  end
end
