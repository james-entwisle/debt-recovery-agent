defmodule IndebtedApi.Session do
  @moduledoc "One ephemeral, serial owner per demo run. Commands are idempotent within the session."
  use GenServer
  alias IndebtedApi.{Fixtures, Replay}

  def open(scenario_id, arm) do
    case Fixtures.scenario(scenario_id) do
      nil ->
        %{"ok" => false, "error" => "scenario_not_found"}

      scenario ->
        id = Base.url_encode64(:crypto.strong_rand_bytes(16), padding: false)

        case DynamicSupervisor.start_child(
               IndebtedApi.Sessions,
               {__MODULE__, {id, scenario, arm}}
             ) do
          {:ok, pid} -> GenServer.call(pid, :view)
          {:error, _} -> %{"ok" => false, "error" => "session_capacity_reached"}
        end
    end
  end

  def get(id), do: call(id, :view)
  def act(id, command_id, command), do: call(id, {:command, command_id, command})

  defp call(id, message) do
    case Registry.lookup(IndebtedApi.SessionRegistry, id) do
      [{pid, _}] -> GenServer.call(pid, message)
      [] -> %{"ok" => false, "error" => "session_not_found"}
    end
  catch
    :exit, _ -> %{"ok" => false, "error" => "session_expired"}
  end

  def start_link({id, _, _} = args),
    do:
      GenServer.start_link(__MODULE__, args,
        name: {:via, Registry, {IndebtedApi.SessionRegistry, id}}
      )

  def child_spec(args),
    do: %{id: __MODULE__, start: {__MODULE__, :start_link, [args]}, restart: :temporary}

  @impl true
  def init({id, scenario, arm}),
    do: {:ok, %{run: Replay.new(id, scenario, arm), receipts: %{}}, 1_800_000}

  @impl true
  def handle_call(:view, _, state), do: {:reply, success(state.run), state, 1_800_000}

  def handle_call({:command, id, command}, _, state) do
    fingerprint = :crypto.hash(:sha256, :erlang.term_to_binary(command))

    cond do
      !is_binary(id) || byte_size(id) not in 1..100 ->
        {:reply, error("invalid_command_id"), state, 1_800_000}

      Map.has_key?(state.receipts, id) && state.receipts[id] == fingerprint ->
        {:reply, success(state.run), state, 1_800_000}

      Map.has_key?(state.receipts, id) ->
        {:reply, error("command_id_conflict"), state, 1_800_000}

      map_size(state.receipts) >= 256 ->
        {:reply, error("restart_session_after_256_commands"), state, 1_800_000}

      true ->
        case Replay.command(state.run, command) do
          {:ok, run} ->
            run = %{run | revision: state.run.revision + 1}

            {:reply, success(run),
             %{state | run: run, receipts: Map.put(state.receipts, id, fingerprint)}, 1_800_000}

          {:error, reason} ->
            {:reply, error(reason), state, 1_800_000}
        end
    end
  end

  @impl true
  def handle_info(:timeout, state), do: {:stop, :normal, state}
  defp success(run), do: %{"ok" => true, "view" => Replay.view(run)}
  defp error(reason), do: %{"ok" => false, "error" => reason}
end
