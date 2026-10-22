defmodule RecoveryApi.Router do
  use Phoenix.Router

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/", RecoveryApi do
    pipe_through(:api)
    get("/health", ApiController, :health)
    get("/scenarios", ApiController, :scenarios)
    post("/sessions", ApiController, :open)
    get("/sessions/:id", ApiController, :view)
    post("/sessions/:id/commands", ApiController, :command)
    post("/sessions/:id/jit-links", ApiController, :jit_link)
    post("/jit/verify", ApiController, :jit_verify)
    get("/jit/:id/:action_id", ApiController, :jit_view)
    post("/jit/:id/:action_id/commands", ApiController, :jit_command)
    get("/economics", ApiController, :economics)
    post("/economics", ApiController, :economics)
  end

  match(:*, "/*path", RecoveryApi.ApiController, :not_found)
end
