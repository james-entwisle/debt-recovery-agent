defmodule IndebtedApi.CaseStudy do
  use Ash.Domain

  resources do
    resource(IndebtedApi.Demonstration)
  end
end
