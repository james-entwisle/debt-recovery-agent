defmodule IndebtedApi.Demonstration do
  @moduledoc "Ash validates operation arguments; local sessions own the simulated effects."
  use Ash.Resource, domain: IndebtedApi.CaseStudy

  actions do
    action :open, :map do
      argument(:scenario_id, :string, allow_nil?: false)

      argument(:arm, :string,
        default: "treatment",
        constraints: [match: ~r/\A(treatment|control)\z/]
      )

      run(fn input, _ ->
        {:ok, IndebtedApi.Session.open(input.arguments.scenario_id, input.arguments.arm)}
      end)
    end

    action :view, :map do
      argument(:session_id, :string, allow_nil?: false)
      run(fn input, _ -> {:ok, IndebtedApi.Session.get(input.arguments.session_id)} end)
    end

    action :command, :map do
      argument(:session_id, :string, allow_nil?: false)
      argument(:command_id, :string, allow_nil?: false)
      argument(:command, :map, allow_nil?: false)

      run(fn input, _ ->
        {:ok,
         IndebtedApi.Session.act(
           input.arguments.session_id,
           input.arguments.command_id,
           input.arguments.command
         )}
      end)
    end

    action :economics, :map do
      argument(:assumptions, :map, default: %{})

      run(fn input, _ ->
        case IndebtedApi.Economics.calculate(input.arguments.assumptions) do
          {:ok, result} -> {:ok, Map.put(result, "ok", true)}
          {:error, reason} -> {:ok, %{"ok" => false, "error" => reason}}
        end
      end)
    end
  end
end
