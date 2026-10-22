defmodule RecoveryApi.PaymentMethods do
  @moduledoc "Invented masked payment references only. No credentials or provider connection."
  def initial, do: [example("demo_card_4242")]

  def example("demo_card_4242"),
    do: %{
      "id" => "demo_card_4242",
      "label" => "Demo Visa ending 4242",
      "last4" => "4242",
      "eligible" => true,
      "simulated" => true
    }

  def example("demo_card_1881"),
    do: %{
      "id" => "demo_card_1881",
      "label" => "Demo Mastercard ending 1881",
      "last4" => "1881",
      "eligible" => true,
      "simulated" => true
    }

  def find(run, id), do: Enum.find(run.payment_methods, &(&1["id"] == id && &1["eligible"]))
end
