"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { ArrowRight, CircleHelp, RotateCcw, ShieldCheck } from "lucide-react";
import { api, type Command, type Scenario, type SessionView } from "@/lib/api";
import { ConsumerPortal } from "./consumer-portal";
import { CommercialModel } from "./commercial-model";
import { JourneySimulator } from "./journey-simulator";

const demoScenarioIds = new Set(["S04", "S05", "S06"]);

export type Act = (command: Command, success?: string) => Promise<boolean>;

export function ResolutionApp() {
  const [tab, setTab] = useState<"portal" | "simulator" | "investment">(
    "portal",
  );
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
      setScenarios(options.filter((option) => demoScenarioIds.has(option.id)));
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
        setScenarios(
          (await api.scenarios()).filter((option) =>
            demoScenarioIds.has(option.id),
          ),
        );
        const id = sessionStorage.getItem("resolution-session");
        if (id) {
          try {
            const restored = await api.view(id);
            if (demoScenarioIds.has(restored.scenario_id)) {
              setView(restored);
              setBusy(false);
              return;
            }
            sessionStorage.removeItem("resolution-session");
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
            className={tab === "portal" ? "selected" : ""}
            aria-pressed={tab === "portal"}
            onPress={() => setTab("portal")}
          >
            Your account
          </Button>
          <Button
            variant="ghost"
            className={tab === "simulator" ? "selected" : ""}
            aria-pressed={tab === "simulator"}
            onPress={() => setTab("simulator")}
          >
            Journey simulator
          </Button>
          <Button
            variant="ghost"
            className={tab === "investment" ? "selected" : ""}
            aria-pressed={tab === "investment"}
            onPress={() => setTab("investment")}
          >
            Investment
          </Button>
        </nav>
      </header>
      <main
        id="main-content"
        className={tab === "investment" ? "investment-main" : ""}
      >
        {tab !== "investment" && (
          <div className="demo-toolbar">
            <div className="demo-context">
              <span className="demo-pill">Demo</span>
              <span>Adaptive Resolution</span>
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
            <ConsumerPortal
              key={view.session_id}
              view={view}
              act={act}
              busy={busy}
            />
          ) : (
            <JourneySimulator
              view={view}
              act={act}
              busy={busy}
              open={open}
              onPortal={() => setTab("portal")}
            />
          )
        ) : (
          <div className="loading-state">
            {busy ? (
              <>
                <Spinner size="md" />
                <h1>Opening your demo account</h1>
                <p>Loading the shared consumer journey.</p>
              </>
            ) : (
              <>
                <h1>Connect to the demonstration</h1>
                <p>
                  Run the API and retry to explore the portal and simulator.
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
        <span>Payments and messages are simulated.</span>
      </footer>
    </div>
  );
}
