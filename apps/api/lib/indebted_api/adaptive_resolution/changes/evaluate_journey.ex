defmodule IndebtedApi.AdaptiveResolution.Changes.EvaluateJourney do
  use Ash.Resource.Change

  @impl true
  def change(changeset, _, _) do
    a = changeset.arguments

    result =
      IndebtedApi.Policy.evaluate(
        a.account,
        a.events,
        a.intent,
        a.contacts,
        a.history,
        a.now,
        a.settings
      )

    attributes =
      Map.new(result, fn
        {"outcome", value} -> {:outcome, String.to_existing_atom(value)}
        {"evaluated_at_utc", value} -> {:evaluated_at_utc, IndebtedApi.Policy.dt(value)}
        {key, value} -> {String.to_existing_atom(key), value}
      end)

    Ash.Changeset.force_change_attributes(changeset, attributes)
  end
end
