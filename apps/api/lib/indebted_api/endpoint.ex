defmodule IndebtedApi.Endpoint do
  use Phoenix.Endpoint, otp_app: :indebted_api
  plug(Plug.RequestId)

  plug(Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason,
    length: 100_000
  )

  plug(IndebtedApi.Router)
end
