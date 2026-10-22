defmodule IndebtedApi.Session do
  @moduledoc "One ephemeral, serial owner per demo run. Commands are idempotent within the session."
  use GenServer
  alias IndebtedApi.{Fixtures, JitAuth, Replay}

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
  def issue_link(id, action_id), do: call(id, {:issue_link, action_id})
  def verify_link(id, action_id, token), do: call(id, {:verify_link, action_id, token})
  def authorized_view(id, action_id, auth), do: call(id, {:authorized_view, action_id, auth})

  def authorized_act(id, action_id, auth, command_id, command),
    do: call(id, {:authorized_command, action_id, auth, command_id, command})

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
    do:
      {:ok, %{run: Replay.new(id, scenario, arm), receipts: %{}, links: %{}, grants: %{}},
       1_800_000}

  @impl true
  def handle_call(:view, _, state), do: {:reply, success(state.run), state, 1_800_000}

  def handle_call({:issue_link, action_id}, _, state) do
    action = find_action(state, action_id)

    if action do
      token = JitAuth.token()
      expires = JitAuth.now() + 120

      link = %{
        action: action_id,
        consumer: state.run.scenario["consumer_id"],
        expires: expires,
        used: false
      }

      links =
        state.links
        |> Enum.filter(fn {_, item} -> item.expires > JitAuth.now() && !item.used end)
        |> Enum.take(7)
        |> Map.new()
        |> Map.put(JitAuth.hash(token), link)

      {:reply,
       %{
         "ok" => true,
         "token" => token,
         "action_id" => action_id,
         "expires_at_utc" => JitAuth.iso(expires)
       }, %{state | links: links}, 1_800_000}
    else
      {:reply, error("jit_action_not_found"), state, 1_800_000}
    end
  end

  def handle_call({:verify_link, action_id, token}, _, state) do
    key = JitAuth.hash(token)
    link = state.links[key]

    cond do
      is_nil(link) || !is_binary(token) || byte_size(token) > 128 ->
        {:reply, error("invalid_jit_link"), state, 1_800_000}

      link.used ->
        {:reply, error("jit_link_already_used"), state, 1_800_000}

      link.expires <= JitAuth.now() ->
        {:reply, error("jit_link_expired"), state, 1_800_000}

      link.action != action_id || link.consumer != state.run.scenario["consumer_id"] ->
        {:reply, error("jit_link_scope_mismatch"), state, 1_800_000}

      is_nil(find_action(state, action_id)) ->
        {:reply, error("jit_action_not_found"), state, 1_800_000}

      true ->
        auth = JitAuth.token()
        grant = %{action: action_id, consumer: link.consumer, expires: JitAuth.now() + 600}

        grants =
          state.grants
          |> Enum.filter(fn {_, item} -> item.expires > JitAuth.now() end)
          |> Enum.take(7)
          |> Map.new()
          |> Map.put(JitAuth.hash(auth), grant)

        state = %{state | links: Map.put(state.links, key, %{link | used: true}), grants: grants}
        {:reply, Map.put(success(state.run), "auth_cookie", auth), state, 1_800_000}
    end
  end

  def handle_call({:authorized_view, action_id, auth}, _, state) do
    {:reply,
     if(authorized?(state, action_id, auth),
       do: success(state.run),
       else: error("jit_session_invalid_or_expired")
     ), state, 1_800_000}
  end

  def handle_call({:authorized_command, action_id, auth, id, command}, from, state) do
    action = find_action(state, action_id)

    cond do
      !authorized?(state, action_id, auth) ->
        {:reply, error("jit_session_invalid_or_expired"), state, 1_800_000}

      !JitAuth.permitted?(action["state"], command) ->
        {:reply, error("jit_action_not_permitted_for_task"), state, 1_800_000}

      true ->
        handle_call({:command, id, command}, from, state)
    end
  end

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
        case execute(state, command) do
          {:ok, next} ->
            run = %{next.run | revision: state.run.revision + 1}

            {:reply, success(run),
             %{next | run: run, receipts: Map.put(state.receipts, id, fingerprint)}, 1_800_000}

          {:error, reason} ->
            {:reply, error(reason), state, 1_800_000}
        end
    end
  end

  @impl true
  def handle_info(:timeout, state), do: {:stop, :normal, state}

  defp execute(state, %{"type" => type})
       when type in ["expire_jit_links", "expire_jit_session"] do
    field = if type == "expire_jit_links", do: :links, else: :grants

    next =
      Map.update!(state, field, fn items ->
        Map.new(items, fn {key, item} -> {key, %{item | expires: 0}} end)
      end)

    {:ok, run} = Replay.command(next.run, %{"type" => "evaluate"})
    {:ok, %{next | run: run}}
  end

  defp execute(state, command) do
    case Replay.command(state.run, command) do
      {:ok, run} -> {:ok, %{state | run: run}}
      error -> error
    end
  end

  defp find_action(state, id),
    do: Enum.find(state.run.conversation["jit_actions"], &(&1["id"] == id))

  defp authorized?(state, action_id, auth) do
    grant = state.grants[JitAuth.hash(auth)]

    grant && grant.action == action_id && grant.consumer == state.run.scenario["consumer_id"] &&
      grant.expires > JitAuth.now() && !is_nil(find_action(state, action_id))
  end

  defp success(run), do: %{"ok" => true, "view" => Replay.view(run)}
  defp error(reason), do: %{"ok" => false, "error" => reason}
end
