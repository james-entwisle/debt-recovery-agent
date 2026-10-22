import Config

config :indebted_api,
  ash_domains: [IndebtedApi.CaseStudy],
  start_server: config_env() != :test,
  port: 4000
