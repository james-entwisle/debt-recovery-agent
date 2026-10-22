defmodule RecoveryApi.RouterTest do
  use ExUnit.Case, async: true
  import Plug.Test

  test "health endpoint returns JSON" do
    conn = RecoveryApi.Router.call(conn(:get, "/health"), RecoveryApi.Router.init([]))
    assert conn.status == 200
    assert Jason.decode!(conn.resp_body) == %{"status" => "ok", "service" => "recovery_api"}
  end

  test "unknown route returns 404" do
    conn = RecoveryApi.Router.call(conn(:get, "/missing"), RecoveryApi.Router.init([]))
    assert conn.status == 404
  end
end
