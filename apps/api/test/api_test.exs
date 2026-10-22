defmodule RecoveryApi.ApiTest do
  use ExUnit.Case, async: true
  import Plug.Test
  alias RecoveryApi.Endpoint

  defp request(method, path, body \\ nil) do
    conn(method, path, if(body, do: Jason.encode!(body), else: nil))
    |> Plug.Conn.put_req_header("content-type", "application/json")
    |> Endpoint.call(Endpoint.init([]))
  end

  defp payload(conn), do: Jason.decode!(conn.resp_body)

  defp open do
    conn = request(:post, "/sessions", %{"scenario_id" => "S04"})
    assert conn.status == 200
    payload(conn)["view"]
  end

  defp command(id, receipt, command),
    do:
      request(:post, "/sessions/#{id}/commands", %{"command_id" => receipt, "command" => command})

  test "session API exposes evaluation and preference matching with the agreed complete view" do
    initial = open()
    id = initial["session_id"]
    assert initial["decision"]["outcome"] == "DEFER"
    evaluated = command(id, "eval", %{"type" => "evaluate"})
    assert evaluated.status == 200
    assert payload(evaluated)["view"]["revision"] == 1

    matched =
      command(id, "match", %{
        "type" => "match_preferences",
        "preferences" => %{"frequency" => "weekly", "max_instalment_usd" => 80}
      })

    assert matched.status == 200
    view = payload(matched)["view"]
    assert view["intent"] == "payday_preference"
    assert hd(view["portal"]["options"])["matches"]
    assert view["portal"]["review_token"]
    assert view["message"]["ai_generated"] == false
    assert view["message"]["disclosure_version"] == "exercise-placeholder-v1"
    assert payload(request(:get, "/sessions/#{id}"))["view"] == view
  end

  test "API validates requests with 422, missing resources with 404, conflicting retry with 409" do
    assert request(:post, "/sessions", %{}).status == 422

    assert request(:post, "/sessions", %{"scenario_id" => "S04", "arm" => "invalid"}).status ==
             422

    assert request(:post, "/sessions", %{"scenario_id" => "missing"}).status == 404
    assert request(:get, "/sessions/missing").status == 404
    id = open()["session_id"]

    assert request(:post, "/sessions/#{id}/commands", %{"command" => %{"type" => "evaluate"}}).status ==
             422

    assert command(id, "bad", %{
             "type" => "match_preferences",
             "preferences" => %{"payday" => "bad"}
           }).status == 422

    assert command(id, "retry", %{"type" => "evaluate"}).status == 200
    assert command(id, "retry", %{"type" => "evaluate"}).status == 200
    conflict = command(id, "retry", %{"type" => "request_help"})
    assert conflict.status == 409
    assert payload(conflict)["error"] == "command_id_conflict"
  end

  test "economics defaults work and malformed assumptions return 422" do
    response = request(:get, "/economics")
    assert response.status == 200
    assert_in_delta payload(response)["result"]["monthly_contribution_usd"], 6098.4, 0.001

    for input <- [
          %{"cohort_mix" => nil},
          %{"reach_pct" => "60"},
          %{"population" => -1},
          %{"unknown" => true}
        ] do
      result = request(:post, "/economics", input)
      assert result.status == 422
      assert payload(result)["error"] == "invalid_economic_assumptions"
    end
  end

  test "all supplied scenarios are discoverable and evaluable" do
    response = request(:get, "/scenarios")
    assert response.status == 200
    scenarios = payload(response)["scenarios"]
    assert length(scenarios) == 12

    for %{"id" => id} <- scenarios do
      result = request(:post, "/sessions", %{"scenario_id" => id})
      assert result.status == 200
      assert payload(result)["view"]["scenario_id"] == id
    end
  end
end
