defmodule RecoveryApi.Application do
  use Application
  @impl true
  def start(_type, _args) do
    children = [
      {Registry, keys: :unique, name: RecoveryApi.SessionRegistry},
      {DynamicSupervisor, strategy: :one_for_one, name: RecoveryApi.Sessions, max_children: 128},
      RecoveryApi.Endpoint
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: RecoveryApi.Supervisor)
  end
end
