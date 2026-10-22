defmodule IndebtedApi.AdaptiveResolution do
  @moduledoc "Business operations for journey decisions and approved repayment options."
  use Ash.Domain

  authorization do
    authorize(:always)
  end

  resources do
    resource IndebtedApi.AdaptiveResolution.JourneyDecision do
      define(:evaluate_journey,
        action: :evaluate,
        args: [:account, :events, :intent, :contacts, :history, :now, :settings]
      )
    end

    resource IndebtedApi.AdaptiveResolution.ApprovedPlanOption do
      define(:match_approved_option,
        action: :match_preferences,
        args: [:option_id, :preferences, :now, :balance_usd]
      )
    end
  end
end
