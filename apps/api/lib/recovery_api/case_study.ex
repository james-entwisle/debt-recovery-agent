defmodule RecoveryApi.CaseStudy do
  use Ash.Domain

  resources do
    resource(RecoveryApi.Demonstration)
  end
end
