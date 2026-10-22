defmodule IndebtedApi.ErrorJSON do
  def render(template, _), do: %{error: Phoenix.Controller.status_message_from_template(template)}
end
