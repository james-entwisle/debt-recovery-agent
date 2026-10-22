defmodule IndebtedApi.Application do
  @moduledoc false
  use Application

  @impl true
  def start(_type, _args) do
    children =
      if Application.fetch_env!(:indebted_api, :start_server) do
        [
          {Bandit,
           plug: IndebtedApi.Router,
           ip: {127, 0, 0, 1},
           port: Application.fetch_env!(:indebted_api, :port)}
        ]
      else
        []
      end

    Supervisor.start_link(children, strategy: :one_for_one, name: IndebtedApi.Supervisor)
  end
end
