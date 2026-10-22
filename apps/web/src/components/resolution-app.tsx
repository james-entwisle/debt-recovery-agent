"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowRight, CircleHelp, ShieldCheck } from "lucide-react";
import { api, type Command, type Scenario, type SessionView } from "@/lib/api";
import { SmsSimulator } from "./sms-simulator";
import { ImessageDemo } from "./imessage-demo";
import { JitPortal } from "./jit-portal";
import { CommercialModel } from "./commercial-model";
import type { LibraryTaskId } from "./jit/action-config";

export type Act = (command: Command, success?: string) => Promise<boolean>;

export function ResolutionApp() {
  const [tab, setTab] = useState<"sms" | "portal" | "investment">("sms");
  const [smsMode, setSmsMode] = useState<"phone" | "inspector">("phone");
  const [jitReturnMode, setJitReturnMode] = useState<"phone" | "inspector">("phone");
  const [previewTask, setPreviewTask] = useState<LibraryTaskId | undefined>(undefined);
  const [jitActionId, setJitActionId] = useState<string | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const initialised = useRef(false);

  const open = useCallback(async (id: string, arm = "treatment") => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const [next, options] = await Promise.all([
        api.open(id, arm),
        api.scenarios(),
      ]);
      setScenarios(options);
      setJitActionId(null);
      setView(next);
      sessionStorage.setItem("resolution-session", next.session_id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to connect to the API. Start the backend and try again.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    async function load() {
      try {
        setScenarios(await api.scenarios());
        const id = sessionStorage.getItem("resolution-session");
        if (id) {
          try {
            const restored = await api.view(id);
            setView(restored);
            setBusy(false);
            return;
          } catch {
            sessionStorage.removeItem("resolution-session");
          }
        }
        await open("S04");
      } catch {
        setError(
          "The demonstration API is unavailable. Start the Elixir backend, then retry.",
        );
        setBusy(false);
      }
    }
    void load();
  }, [open]);

  useEffect(() => {
    const id = view?.session_id;
    if (!id) return;
    const refresh = async () => {
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      try {
        const next = await api.view(id);
        setView((current) =>
          current?.session_id === next.session_id &&
          current.revision <= next.revision
            ? next
            : current,
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Could not refresh the demo session.",
        );
      } finally {
        locked.current = false;
        setBusy(false);
      }
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [view?.session_id]);

  const act: Act = async (command, success) => {
    if (!view || locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setView(await api.command(view.session_id, command));
      if (success) setNotice(success);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "This action could not be completed. Please retry.",
      );
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="wordmark" href="/" aria-label="Debt Recovery Agent home">
          <svg className="wordmark-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#000244" />
            <rect x="6" y="7" width="14" height="9" rx="4.5" fill="#75ECE2" />
            <rect x="12" y="15" width="14" height="9" rx="4.5" fill="#474CDE" />
          </svg>
          <span className="wordmark-name">Debt Recovery Agent</span>
        </Link>
        <nav className="view-switch" aria-label="Experience">
          <Button
            variant="ghost"
            className={tab === "sms" ? "selected" : ""}
            aria-pressed={tab === "sms"}
            onPress={() => setTab("sms")}
          >
            SMS Simulator
          </Button>
          <Button
            variant="ghost"
            className={tab === "portal" ? "selected" : ""}
            aria-pressed={tab === "portal"}
            onPress={() => {
              if (tab === "sms") setJitReturnMode(smsMode);
              setTab("portal");
            }}
          >
            JIT Portal
          </Button>
          <Button
            variant="ghost"
            className={tab === "investment" ? "selected" : ""}
            aria-pressed={tab === "investment"}
            onPress={() => setTab("investment")}
          >
            Financial Model
          </Button>
        </nav>
      </header>
      <main
        id="main-content"
        className={
          tab === "investment"
            ? "investment-main"
            : tab === "sms"
              ? "sms-main"
              : "jit-main"
        }
      >
        {error && (
          <div className="alert error" role="alert">
            <CircleHelp size={18} />
            <span>{error}</span>
            <Button
              size="sm"
              variant="outline"
              isDisabled={busy}
              onPress={() => void open(view?.scenario_id ?? "S04")}
            >
              Retry
            </Button>
          </div>
        )}
        <div aria-live="polite" role="status">
          {notice && (
            <div className="alert success">
              <ShieldCheck size={17} />
              {notice}
            </div>
          )}
        </div>
        {tab === "investment" ? (
          <CommercialModel />
        ) : tab === "sms" && smsMode === "phone" && view ? (
          <ImessageDemo
            key={view.session_id}
            view={view}
            busy={busy}
            act={act}
            open={async (id) => { await open(id); }}
            onPreview={(task) => {
              setPreviewTask(task);
              setJitReturnMode("phone");
              setTab("portal");
            }}
            onOpenJit={(actionId) => {
              setPreviewTask(undefined);
              setJitReturnMode("phone");
              setJitActionId(actionId);
              setTab("portal");
            }}
          />
        ) : view ? (
          tab === "portal" ? (
            <JitPortal
              view={view}
              actionId={jitActionId}
              previewTask={previewTask}
              busy={busy}
              onView={(next) =>
                setView((current) => {
                  if (!current || current.session_id !== next.session_id)
                    return next;
                  return current.revision <= next.revision ? next : current;
                })
              }
              onLeave={() => {
                setSmsMode(jitReturnMode);
                setTab("sms");
              }}
            />
          ) : (
            <>
            {tab === "sms" && (
              <p className="imsg-back-to-phone">
                <button type="button" onClick={() => setSmsMode("phone")}>
                  Back to iPhone
                </button>
              </p>
            )}
            <SmsSimulator
              view={view}
              act={act}
              busy={busy}
              scenarios={scenarios}
              open={async (id) => { await open(id); }}
              onOpenJit={(actionId) => {
                setJitReturnMode("inspector");
                setJitActionId(actionId);
                setTab("portal");
              }}
            />
            </>
          )
        ) : (
          <div className="loading-state">
            {busy ? (
              <>
                <Spinner size="md" />
                <h1>Opening the conversation</h1>
                <p>Loading the synthetic account and conversation session.</p>
              </>
            ) : (
              <>
                <h1>Connect to the demonstration</h1>
                <p>Run the API and retry to explore SMS and JIT tasks.</p>
                <Button onPress={() => void open("S04")}>
                  Open S04 <ArrowRight size={16} />
                </Button>
              </>
            )}
          </div>
        )}
      </main>
      <footer className="app-footer">
        <span>Case study · Synthetic account</span>
        <span>Messages, verification and payments are simulated.</span>
      </footer>
    </div>
  );
}
