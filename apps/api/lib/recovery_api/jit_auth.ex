defmodule RecoveryApi.JitAuth do
  @moduledoc "Ephemeral opaque-token demo verification; possession is not proof of real identity."
  @plan ~w(match_preferences record_intent save_draft resume_draft confirm_plan request_help add_demo_payment_method)
  def token, do: Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)
  def hash(value) when is_binary(value), do: :crypto.hash(:sha256, value)
  def hash(_), do: nil
  def now, do: System.system_time(:second)
  def iso(seconds), do: DateTime.from_unix!(seconds) |> DateTime.to_iso8601()

  def permitted?(state, command) do
    allowed =
      case state do
        s when s in ~w(options payday draft resume review) -> @plan
        "payment" -> ~w(simulate_payment request_help add_demo_payment_method)
        "early_payoff" -> ~w(simulate_early_payoff request_help add_demo_payment_method)
        "change_date" -> ~w(request_plan_change request_help)
        "change_frequency" -> ~w(request_plan_change request_help)
        "active_plan" -> ~w(request_help)
        s when s in ~w(account clarification help pending) -> ~w(record_intent request_help)
        _ -> []
      end

    is_map(command) && command["type"] in allowed &&
      (command["type"] != "request_plan_change" ||
         (state == "change_date" && command["change_type"] == "date") ||
         (state == "change_frequency" && command["change_type"] == "frequency"))
  end
end
