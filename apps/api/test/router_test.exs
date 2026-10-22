defmodule IndebtedApi.RouterTest do
  use ExUnit.Case, async: true
  import Plug.Test

  test "health endpoint returns JSON" do
    conn = IndebtedApi.Router.call(conn(:get, "/health"), IndebtedApi.Router.init([]))
    assert conn.status == 200
    assert Jason.decode!(conn.resp_body) == %{"status" => "ok", "service" => "indebted_api"}
  end

  test "unknown route returns 404" do
    conn = IndebtedApi.Router.call(conn(:get, "/missing"), IndebtedApi.Router.init([]))
    assert conn.status == 404
  end
end
