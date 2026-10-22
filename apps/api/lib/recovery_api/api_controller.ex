defmodule RecoveryApi.ApiController do
  use Phoenix.Controller, formats: [:json]
  alias RecoveryApi.{Demonstration, Fixtures, Session}

  def health(conn, _), do: json(conn, %{status: "ok", service: "recovery_api"})

  def scenarios(conn, _) do
    labels = %{
      "S01" => "Open only",
      "S02" => "Message click",
      "S03" => "Portal visit",
      "S04" => "Incomplete plan",
      "S05" => "Opt-out before event",
      "S06" => "Payment before event",
      "S07" => "Contact limits",
      "S08" => "Unknown timezone",
      "S09" => "Outside scope",
      "S10" => "Hardship review",
      "S11" => "Duplicate event",
      "S12" => "Active plan, late event"
    }

    json(conn, %{
      scenarios:
        Enum.map(
          Fixtures.scenarios(),
          &%{id: &1["scenario_id"], label: labels[&1["scenario_id"]]}
        )
    })
  end

  def open(conn, params),
    do:
      action(conn, :open, %{
        scenario_id: params["scenario_id"],
        arm: Map.get(params, "arm", "treatment")
      })

  def view(conn, %{"id" => id}), do: action(conn, :view, %{session_id: id})

  def command(conn, %{"id" => id} = params),
    do:
      action(conn, :command, %{
        session_id: id,
        command_id: params["command_id"],
        command: params["command"]
      })

  def jit_link(conn, %{"id" => id} = params),
    do: result(conn, Session.issue_link(id, params["action_id"]))

  def jit_verify(conn, params) do
    response = Session.verify_link(params["session_id"], params["action_id"], params["token"])

    case Map.pop(response, "auth_cookie") do
      {nil, response} ->
        result(conn, response)

      {auth, response} ->
        conn
        |> put_resp_cookie("recovery_jit", auth,
          http_only: true,
          same_site: "Strict",
          secure: false,
          max_age: 600,
          path: "/"
        )
        |> result(response)
    end
  end

  def jit_view(conn, %{"id" => id, "action_id" => action}) do
    conn = fetch_cookies(conn)
    result(conn, Session.authorized_view(id, action, conn.req_cookies["recovery_jit"]))
  end

  def jit_command(conn, %{"id" => id, "action_id" => action} = params) do
    conn = fetch_cookies(conn)

    result(
      conn,
      Session.authorized_act(
        id,
        action,
        conn.req_cookies["recovery_jit"],
        params["command_id"],
        params["command"]
      )
    )
  end

  defp result(conn, %{"ok" => false, "error" => reason} = response) do
    status =
      cond do
        reason in ~w(session_not_found session_expired jit_action_not_found) -> 404
        reason == "jit_action_not_permitted_for_task" -> 403
        String.starts_with?(reason, "jit_") || reason == "invalid_jit_link" -> 401
        reason == "command_id_conflict" -> 409
        true -> 422
      end

    conn |> put_status(status) |> json(response)
  end

  defp result(conn, response), do: json(conn, response)

  def economics(conn, params),
    do: action(conn, :economics, %{assumptions: Map.drop(params, ["id"])})

  def not_found(conn, _), do: conn |> put_status(404) |> json(%{error: "not_found"})

  defp action(conn, name, args) do
    case Demonstration |> Ash.ActionInput.for_action(name, args) |> Ash.run_action() do
      {:ok, %{"ok" => false, "error" => reason} = result} ->
        status =
          cond do
            reason in ~w(session_not_found scenario_not_found session_expired) -> 404
            reason == "command_id_conflict" -> 409
            true -> 422
          end

        conn |> put_status(status) |> json(result)

      {:ok, result} ->
        json(conn, result)

      {:error, _} ->
        conn |> put_status(422) |> json(%{ok: false, error: "invalid_action_arguments"})
    end
  end
end
