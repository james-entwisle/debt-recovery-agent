defmodule RecoveryApi.JitAuthTest do
  use ExUnit.Case, async: true
  import Plug.Test
  import ExUnit.CaptureLog
  alias RecoveryApi.Session

  defp setup_task(state \\ "payday") do
    %{"view" => view} = Session.open("S04", "treatment")
    id = view["session_id"]
    %{"view" => view} = Session.act(id, "create", %{"type" => "create_jit", "state" => state})
    action = List.last(view["conversation"]["jit_actions"])["id"]
    {id, action}
  end

  test "opaque links are one-use, scoped to account and action, and never exposed in views" do
    {id, action} = setup_task()
    {other, other_action} = setup_task()
    %{"ok" => true, "token" => token} = Session.issue_link(id, action)
    assert byte_size(token) >= 40
    assert Session.verify_link(other, other_action, token)["error"] == "invalid_jit_link"
    assert Session.verify_link(id, "wrong-purpose", token)["error"] == "jit_link_scope_mismatch"

    assert Session.authorized_view(id, action, "invented-cookie")["error"] ==
             "jit_session_invalid_or_expired"

    %{"ok" => true, "auth_cookie" => cookie, "view" => view} =
      Session.verify_link(id, action, token)

    assert Session.verify_link(id, action, token)["error"] == "jit_link_already_used"
    assert Session.authorized_view(id, action, cookie)["ok"]

    assert Session.authorized_view(other, other_action, cookie)["error"] ==
             "jit_session_invalid_or_expired"

    refute String.contains?(Jason.encode!(view), token)
    refute String.contains?(Jason.encode!(view), cookie)
    %{"view" => extra} = Session.act(id, "extra", %{"type" => "create_jit", "state" => "payment"})
    extra_id = List.last(extra["conversation"]["jit_actions"])["id"]

    assert Session.authorized_view(id, extra_id, cookie)["error"] ==
             "jit_session_invalid_or_expired"
  end

  test "expired links and scoped sessions are rejected using wall time independent of replay clock" do
    {id, action} = setup_task()
    %{"token" => token} = Session.issue_link(id, action)
    assert Session.act(id, "expire-link", %{"type" => "expire_jit_links"})["ok"]
    assert Session.verify_link(id, action, token)["error"] == "jit_link_expired"
    %{"token" => fresh} = Session.issue_link(id, action)
    %{"auth_cookie" => cookie} = Session.verify_link(id, action, fresh)
    assert Session.act(id, "expire-cookie", %{"type" => "expire_jit_session"})["ok"]

    assert Session.authorized_view(id, action, cookie)["error"] ==
             "jit_session_invalid_or_expired"
  end

  test "operator expiry is idempotent and a retry does not expire a subsequently issued link" do
    {id, action} = setup_task()
    %{"token" => old} = Session.issue_link(id, action)
    assert Session.act(id, "expire-once", %{"type" => "expire_jit_links"})["ok"]
    assert Session.verify_link(id, action, old)["error"] == "jit_link_expired"
    %{"token" => new} = Session.issue_link(id, action)
    assert Session.act(id, "expire-once", %{"type" => "expire_jit_links"})["ok"]
    assert Session.verify_link(id, action, new)["ok"]

    assert Session.act(id, "expire-once", %{"type" => "evaluate"})["error"] ==
             "command_id_conflict"
  end

  test "scoped task commands cannot patch sources or perform unrelated actions" do
    {id, action} = setup_task("help")
    %{"token" => token} = Session.issue_link(id, action)
    %{"auth_cookie" => cookie} = Session.verify_link(id, action, token)

    for command <- [
          %{"type" => "patch_account", "patch" => %{"holds" => []}},
          %{"type" => "simulate_payment", "confirmed" => true, "amount_usd" => 20},
          %{"type" => "expire_jit_session"},
          %{"type" => "save_draft", "option_id" => "weekly-80"}
        ] do
      assert Session.authorized_act(id, action, cookie, "reject", command)["error"] ==
               "jit_action_not_permitted_for_task"
    end

    result = Session.authorized_act(id, action, cookie, "help", %{"type" => "request_help"})
    assert result["ok"]
    assert result["view"]["intent"] == "request_help"
    assert result["view"]["conversation"]["escalation_pending"]
    assert result["view"]["account"]["holds"] == []
  end

  test "verified plan task supports save, leave, return through fresh link and explicit confirmation" do
    {id, action} = setup_task("draft")
    %{"token" => token} = Session.issue_link(id, action)
    %{"auth_cookie" => cookie} = Session.verify_link(id, action, token)

    saved =
      Session.authorized_act(id, action, cookie, "save", %{
        "type" => "save_draft",
        "option_id" => "weekly-80"
      })

    assert saved["view"]["confirmed_plan"] == nil
    assert saved["view"]["payment"] == nil
    assert Session.act(id, "leave", %{"type" => "expire_jit_session"})["ok"]
    %{"view" => view} = Session.act(id, "return", %{"type" => "create_jit", "state" => "resume"})
    resume_id = List.last(view["conversation"]["jit_actions"])["id"]
    %{"token" => fresh} = Session.issue_link(id, resume_id)
    %{"auth_cookie" => returned_cookie} = Session.verify_link(id, resume_id, fresh)

    resumed =
      Session.authorized_act(id, resume_id, returned_cookie, "resume", %{"type" => "resume_draft"})

    assert resumed["view"]["conversation"]["draft"]["status"] == "resumed"

    confirmed =
      Session.authorized_act(id, resume_id, returned_cookie, "confirm", %{
        "type" => "confirm_plan",
        "option_id" => "weekly-80",
        "confirmed" => true,
        "review_token" => resumed["view"]["portal"]["review_token"]
      })

    assert confirmed["view"]["account"]["plan_status"] == "active"
    assert confirmed["view"]["payment"] == nil
    assert confirmed["view"]["conversation"]["draft"]["status"] == "confirmed"
    assert confirmed["view"]["conversation"]["decision"]["chosen_action"] == "plan_confirmed"

    assert confirmed["view"]["conversation"]["decision"]["classification"] ==
             "authenticated_jit_outcome"

    assert Enum.all?(
             confirmed["view"]["conversation"]["jit_actions"],
             &(&1["status"] == "completed")
           )

    assert List.last(confirmed["view"]["conversation"]["messages"])["kind"] == "jit_outcome"
  end

  test "HTTP exchange sets HttpOnly SameSite cookie and filters token from controller logs" do
    {id, action} = setup_task()
    %{"token" => token} = Session.issue_link(id, action)

    logs =
      capture_log(fn ->
        conn =
          conn(:post, "/jit/verify", %{
            "session_id" => id,
            "action_id" => action,
            "token" => token
          })
          |> RecoveryApi.Router.call(RecoveryApi.Router.init([]))

        assert conn.status == 200
        assert conn.resp_cookies["recovery_jit"].http_only
        assert conn.resp_cookies["recovery_jit"].same_site == "Strict"
        assert conn.resp_cookies["recovery_jit"].max_age == 600
        refute Map.has_key?(Jason.decode!(conn.resp_body), "auth_cookie")
      end)

    refute String.contains?(logs, token)
    assert String.contains?(logs, "[FILTERED]")
  end
end
