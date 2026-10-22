defmodule IndebtedApi.MixProject do
  use Mix.Project

  def project do
    [
      app: :indebted_api,
      version: "0.1.0",
      elixir: "~> 1.19",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [extra_applications: [:logger], mod: {IndebtedApi.Application, []}]
  end

  defp deps do
    [{:ash, "~> 3.37"}, {:bandit, "~> 1.13"}, {:plug, "~> 1.19"}, {:jason, "~> 1.4"}]
  end
end
