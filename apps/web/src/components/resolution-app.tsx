"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowRight, CircleHelp, RotateCcw, ShieldCheck } from "lucide-react";
import { api, type Command, type Scenario, type SessionView } from "@/lib/api";
import { SmsSimulator } from "./sms-simulator";
import { JitPortal } from "./jit-portal";
import { CommercialModel } from "./commercial-model";

export type Act = (command: Command, success?: string) => Promise<boolean>;

export function ResolutionApp() {
  const [tab, setTab] = useState<"sms" | "portal" | "investment">("sms");
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
        <Link className="wordmark" href="/" aria-label="InDebted home">
          <Image
            src="/brand/indebted-logo.svg"
            alt="InDebted"
            width={186}
            height={33}
            priority
          />
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
            onPress={() => setTab("portal")}
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
        className={tab === "investment" ? "investment-main" : tab === "sms" ? "sms-main" : "jit-main"}
      >
        {tab === "portal" && (
          <div className="demo-toolbar">
            <div className="demo-context">
              <span className="demo-pill">Demo</span>
              <span>Operator controls · Synthetic account</span>
            </div>
            <div className="scenario-controls">
              <label className="sr-only" htmlFor="scenario">
                Scenario
              </label>
              <select
                id="scenario"
                value={view?.scenario_id ?? "S04"}
                disabled={busy}
                onChange={(e) => void open(e.target.value)}
              >
                {(scenarios.length
                  ? scenarios
                  : [{ id: "S04", label: "Incomplete plan" }]
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.label}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                isDisabled={busy || !view}
                onPress={() => void open(view?.scenario_id ?? "S04")}
              >
                <RotateCcw size={14} /> Reset
              </Button>
            </div>
          </div>
        )}
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
        ) : view ? (
          tab === "portal" ? (
            <JitPortal
              key={view.session_id}
              view={view}
              actionId={jitActionId}
              busy={busy}
              act={act}
              onView={(next) => setView((current) =>
                current?.session_id === next.session_id && current.revision <= next.revision
                  ? next : current)}
              onAction={setJitActionId}
              onLeave={() => setTab("sms")}
            />
          ) : (
            <SmsSimulator
              view={view}
              act={act}
              busy={busy}
              scenarios={scenarios}
              open={open}
              onOpenJit={(actionId) => {
                setJitActionId(actionId);
                setTab("portal");
              }}
            />
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
                <p>
                  Run the API and retry to explore SMS and JIT tasks.
                </p>
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
