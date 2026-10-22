defmodule IndebtedApi.JitAuth do
  @moduledoc "Ephemeral opaque-token demo verification; possession is not proof of real identity."
  @plan ~w(match_preferences record_intent save_draft resume_draft confirm_plan request_help)
  def token, do: Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)
  def hash(value) when is_binary(value), do: :crypto.hash(:sha256, value)
  def hash(_), do: nil
  def now, do: System.system_time(:second)
  def iso(seconds), do: DateTime.from_unix!(seconds) |> DateTime.to_iso8601()

  def permitted?(state, command) do
    allowed =
      case state do
        s when s in ~w(options payday draft resume review) -> @plan
        "payment" -> ~w(simulate_payment request_help)
        s when s in ~w(account clarification help pending) -> ~w(record_intent request_help)
        _ -> []
      end

    is_map(command) && command["type"] in allowed
  end
end
