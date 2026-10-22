# API

Elixir OTP application using Ash, Plug and Bandit. See the repository [README](../../README.md) for setup.

- `mix run --no-halt` starts the local HTTP server on port 4000.
- `API_PORT=4001 mix run --no-halt` chooses another port.
- `GET /health` returns service status as JSON.
- `mix test` checks routing without starting the HTTP listener.

`IndebtedApi.CaseStudy` is a registered Ash domain with no resources yet. Product behaviour and persistence will follow the chosen recommendation.
