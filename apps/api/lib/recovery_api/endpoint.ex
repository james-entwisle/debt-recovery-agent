defmodule RecoveryApi.Endpoint do
  use Phoenix.Endpoint, otp_app: :recovery_api
  plug(Plug.RequestId)

  plug(Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason,
    length: 100_000
  )

  plug(RecoveryApi.Router)
end
