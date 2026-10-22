import Config
config :ash, default_string_length_count: :codepoints
config :indebted_api, ash_domains: [IndebtedApi.CaseStudy, IndebtedApi.AdaptiveResolution]
config :elixir, :time_zone_database, Tzdata.TimeZoneDatabase
config :tzdata, :autoupdate, :disabled
config :phoenix, :json_library, Jason

config :indebted_api, IndebtedApi.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  http: [ip: {127, 0, 0, 1}, port: 4000],
  server: config_env() != :test,
  secret_key_base:
    "local-synthetic-demo-only-not-an-authentication-system-012345678901234567890123456789",
  render_errors: [formats: [json: IndebtedApi.ErrorJSON], layout: false]
