defmodule IndebtedApi.Router do
  use Phoenix.Router

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/", IndebtedApi do
    pipe_through(:api)
    get("/health", ApiController, :health)
    get("/scenarios", ApiController, :scenarios)
    post("/sessions", ApiController, :open)
    get("/sessions/:id", ApiController, :view)
    post("/sessions/:id/commands", ApiController, :command)
    get("/economics", ApiController, :economics)
    post("/economics", ApiController, :economics)
  end

  match(:*, "/*path", IndebtedApi.ApiController, :not_found)
end
