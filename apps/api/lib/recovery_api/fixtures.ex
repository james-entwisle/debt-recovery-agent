defmodule RecoveryApi.Fixtures do
  @moduledoc "Immutable exercise inputs and separately labelled invented portal fixtures."
  @root Path.expand("../../../..", __DIR__)
  @scenario_path Path.join(@root, "brief/04_consumer_scenarios.json")
  @cohort_path Path.join(@root, "brief/03_historical_cohorts.csv")
  @external_resource @scenario_path
  @external_resource @cohort_path

  def scenarios, do: @scenario_path |> File.read!() |> Jason.decode!() |> Map.fetch!("scenarios")
  def scenario(id), do: Enum.find(scenarios(), &(&1["scenario_id"] == id))

  def plans do
    :recovery_api
    |> :code.priv_dir()
    |> Path.join("fixtures/approved_plan_options.json")
    |> File.read!()
    |> Jason.decode!()
  end

  def cohorts do
    [header | rows] = @cohort_path |> File.read!() |> String.trim() |> String.split(~r/\r?\n/)
    keys = String.split(header, ",")

    Enum.map(rows, fn row ->
      keys
      |> Enum.zip(String.split(row, ","))
      |> Map.new(fn {k, v} ->
        {k, if(k in ["cohort_id", "signal", "synthetic"], do: v, else: String.to_integer(v))}
      end)
    end)
  end
end
