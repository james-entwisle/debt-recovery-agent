"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import {
  api,
  humanise,
  type Command,
  type JitState,
  type SessionView,
} from "@/lib/api";
import type { Act } from "./resolution-app";
import {
  libraryTaskForState,
  libraryTasks,
  type LibraryTask,
  type LibraryTaskId,
} from "./jit/action-config";
import { JitActionRenderer, UpdateMethodAction } from "./jit/action-renderer";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "This action could not be completed. Please try again.";
}

function accountBlocked(view: SessionView) {
  return (
    view.account.payment_status === "pending" ||
    view.account.payment_status === "settled" ||
    (view.account.holds?.length ?? 0) > 0
  );
}

function usableDraft(view: SessionView) {
  const draft = view.conversation.draft;
  return !!draft && (draft.status === "saved" || draft.status === "resumed");
}

function startingTask(
  view: SessionView,
  actionId: string | null,
  previewTask?: LibraryTaskId,
): LibraryTaskId {
  if (previewTask && libraryTasks.some((item) => item.id === previewTask))
    return previewTask;
  const state = view.conversation.jit_actions.find(
    (item) => item.id === actionId,
  )?.state;
  return (state && libraryTaskForState(state)) || "plan";
}

export function JitPortal({
  view,
  actionId,
  previewTask,
  busy,
  onView,
  onLeave,
}: {
  view: SessionView;
  actionId: string | null;
  previewTask?: LibraryTaskId;
  busy: boolean;
  onView: (view: SessionView) => void;
  onLeave?: () => void;
}) {
  const [selected, setSelected] = useState<LibraryTaskId>(() =>
    startingTask(view, actionId, previewTask),
  );
  const [shown, setShown] = useState<LibraryTaskId | null>(null);
  const [screen, setScreen] = useState(view);
  const [preparing, setPreparing] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const viewRef = useRef(view);
  const onViewRef = useRef(onView);
  const epoch = useRef(0);
  const desired = useRef<{ task: LibraryTask; interactive: boolean } | null>(
    null,
  );
  const running = useRef(false);
  const booted = useRef(false);
  useEffect(() => {
    onViewRef.current = onView;
  }, [onView]);

  useEffect(() => {
    const current = viewRef.current;
    if (
      current.session_id === view.session_id &&
      view.revision >= current.revision
    ) {
      viewRef.current = view;
      setScreen(view);
    }
  }, [view]);

  const publish = useCallback((next: SessionView) => {
    viewRef.current = next;
    setScreen(next);
    onViewRef.current(next);
  }, []);

  const resetAccount = useCallback(async (current: SessionView) => {
    const opened = await api.open(current.scenario_id);
    sessionStorage.setItem("resolution-session", opened.session_id);
    viewRef.current = opened;
    onViewRef.current(opened);
    return opened;
  }, []);

  const prepare = useCallback(
    async (task: LibraryTask, interactive: boolean) => {
      const ticket = ++epoch.current;
      setPreparing(true);
      setWorking(false);
      try {
        const next = await shapeAccount(
          viewRef.current,
          task,
          interactive,
          resetAccount,
        );
        if (ticket !== epoch.current) return;
        publish(next);
        setShown(task.id);
        setError("");
        setPreparing(false);
      } catch (failure) {
        if (ticket !== epoch.current) return;
        setError(errorMessage(failure));
        setPreparing(false);
      }
    },
    [publish, resetAccount],
  );

  const run = useCallback(
    (id: LibraryTaskId, interactive: boolean) => {
      const task = libraryTasks.find((item) => item.id === id);
      if (!task) return;
      setSelected(id);
      desired.current = { task, interactive };
      void pump();

      async function pump() {
        if (running.current) return;
        running.current = true;
        try {
          while (desired.current) {
            const job = desired.current;
            desired.current = null;
            await prepare(job.task, job.interactive);
          }
        } finally {
          running.current = false;
        }
        if (desired.current) void pump();
      }
    },
    [prepare],
  );

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    run(startingTask(viewRef.current, actionId, previewTask), false);
  }, [actionId, previewTask, run]);

  const loading = busy || working;
  const task = libraryTasks.find((item) => item.id === shown);
  const scopedAct: Act = async (command: Command) => {
    const sessionId = viewRef.current.session_id;
    const ticket = epoch.current;
    setWorking(true);
    setError("");
    try {
      const next = await api.command(sessionId, command);
      if (ticket !== epoch.current || viewRef.current.session_id !== sessionId)
        return false;
      publish(next);
      if (
        command.type === "resume_draft" &&
        next.conversation.draft?.status !== "resumed"
      ) {
        setError(
          `This draft can’t be resumed. ${humanise(next.conversation.draft?.invalid_reason ?? "The account or approved terms changed")}. Review current options to continue.`,
        );
        return false;
      }
      return true;
    } catch (failure) {
      if (ticket === epoch.current) setError(errorMessage(failure));
      return false;
    } finally {
      if (ticket === epoch.current) setWorking(false);
    }
  };

  function openTask(state: JitState) {
    const id = libraryTaskForState(state);
    if (id) run(id, true);
  }

  return (
    <div className="jit-library">
      <nav className="jit-library-nav" aria-label="Tasks">
        {libraryTasks.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={selected === item.id ? "true" : undefined}
            onClick={() => run(item.id, true)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <section className="jit-preview-stage">
        <div
          className="jit-action-panel"
          aria-busy={preparing || loading}
          aria-label={task?.label ?? "Task"}
        >
          {preparing || !task ? (
            <div className="jit-library-loading">
              {error ? (
                <p className="jit-action-error" role="alert">
                  {error}
                </p>
              ) : (
                <>
                  <Spinner size="md" />
                  <p>Opening task</p>
                </>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div className="jit-action-error" role="alert">
                  {error}
                </div>
              )}
              {task.id === "method" ? (
                <UpdateMethodAction
                  key={`${task.id}-${screen.session_id}`}
                  state="active_plan"
                  view={screen}
                  act={scopedAct}
                  busy={loading}
                  onLeave={() => onLeave?.()}
                  onTask={openTask}
                />
              ) : (
                task.state && (
                  <JitActionRenderer
                    key={`${task.id}-${screen.session_id}`}
                    state={task.state}
                    view={screen}
                    act={scopedAct}
                    busy={loading}
                    onLeave={() => onLeave?.()}
                    onTask={openTask}
                  />
                )
              )}
            </>
          )}
        </div>
      </section>
      <p className="jit-library-note">Simulated access. No money moves.</p>
    </div>
  );
}

async function shapeAccount(
  current: SessionView,
  task: LibraryTask,
  interactive: boolean,
  reset: (view: SessionView) => Promise<SessionView>,
) {
  if (task.fixture === "fresh") {
    if (accountBlocked(current) || (interactive && current.confirmed_plan))
      return reset(current);
    return current;
  }
  if (task.fixture === "draft") {
    let next = current;
    if (accountBlocked(next) || next.confirmed_plan) next = await reset(next);
    if (!usableDraft(next)) next = await saveExampleDraft(next, reset);
    return next;
  }
  if (task.fixture === "plan") {
    let next = current;
    if (accountBlocked(next)) next = await reset(next);
    if (!next.confirmed_plan)
      next = await api.command(next.session_id, {
        type: "setup_demo_active_plan",
      });
    return next;
  }
  if (task.fixture === "payment" && accountBlocked(current))
    return reset(current);
  return current;
}

async function saveExampleDraft(
  current: SessionView,
  reset: (view: SessionView) => Promise<SessionView>,
) {
  const attempt = async (source: SessionView) => {
    const option = source.portal.options.find(
      (item) =>
        item.matches && item.total_usd === source.account.balance_usd,
    );
    if (!option) return null;
    const methodId = source.portal.payment_methods.find(
      (item) => item.eligible,
    )?.id;
    return api.command(source.session_id, {
      type: "save_draft",
      option_id: option.id,
      step: "method",
      ...(methodId ? { payment_method_id: methodId } : {}),
    });
  };
  const saved = await attempt(current);
  if (saved) return saved;
  const opened = await reset(current);
  const retried = await attempt(opened);
  if (!retried)
    throw new Error("A saved plan isn’t available on this account.");
  return retried;
}
