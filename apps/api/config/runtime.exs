import Config

config :indebted_api, :port, String.to_integer(System.get_env("API_PORT", "4000"))
