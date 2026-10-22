defmodule IndebtedApi.Application do
  use Application
  @impl true
  def start(_type, _args) do
    children = [
      {Registry, keys: :unique, name: IndebtedApi.SessionRegistry},
      {DynamicSupervisor, strategy: :one_for_one, name: IndebtedApi.Sessions, max_children: 128},
      IndebtedApi.Endpoint
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: IndebtedApi.Supervisor)
  end
end
