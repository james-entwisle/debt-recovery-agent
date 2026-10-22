import Config

config :recovery_api, RecoveryApi.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: String.to_integer(System.get_env("API_PORT", "4000"))]
