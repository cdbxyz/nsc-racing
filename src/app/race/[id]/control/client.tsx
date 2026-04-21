"use client";

import {
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  startRace,
  recordLap,
  setEntryStatus,
  undoLastLap,
  finishRace,
} from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntryStatus =
  | "racing"
  | "FIN"
  | "DNF"
  | "DNS"
  | "DSQ"
  | "RET"
  | "OCS"
  | "DNC";

export interface InitialEntry {
  id: string;
  racerName: string;
  sailNumber: string;
  className: string;
  lapsToSail: number;
  serverLaps: { lapNumber: number; cumulativeElapsedMs: number }[];
  status: EntryStatus;
  finishTimeMs: number | null;
}

interface EntryState extends InitialEntry {
  pendingLaps: number; // in-flight laps not yet server-confirmed
  debounceUntil: number | null; // performance.now() timestamp
}

type PendingAction =
  | {
      clientId: string;
      type: "lap";
      entryId: string;
      lapNumber: number;
      cumulativeElapsedMs: number;
      lapsToSail: number;
    }
  | {
      clientId: string;
      type: "status";
      entryId: string;
      newStatus: Exclude<EntryStatus, "racing" | "FIN">;
    }
  | {
      clientId: string;
      type: "undo";
      entryId: string;
    };

interface State {
  raceStatus: "draft" | "running" | "finished";
  startedAt: string | null;
  entries: EntryState[];
  queue: PendingAction[];
  isOnline: boolean;
  clockMs: number;
  error: string | null;
}

type Action =
  | { type: "RACE_STARTED"; startedAt: string }
  | { type: "RACE_FINISHED" }
  | { type: "TAP_LAP"; entryId: string; cumulativeMs: number; clientId: string }
  | {
      type: "LAP_CONFIRMED";
      clientId: string;
      entryId: string;
      lapNumber: number;
      cumulativeMs: number;
      lapsToSail: number;
    }
  | { type: "SET_STATUS_OPTIMISTIC"; entryId: string; status: EntryStatus; clientId: string }
  | { type: "STATUS_CONFIRMED"; clientId: string; entryId: string; newStatus: EntryStatus }
  | { type: "UNDO_OPTIMISTIC"; entryId: string; clientId: string }
  | { type: "UNDO_CONFIRMED"; clientId: string; entryId: string }
  | { type: "ACTION_FAILED"; clientId: string }
  | { type: "TICK"; clockMs: number }
  | { type: "NETWORK"; isOnline: boolean }
  | { type: "CLEAR_DEBOUNCE"; entryId: string }
  | { type: "SET_ERROR"; msg: string }
  | { type: "CLEAR_ERROR" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function formatClock(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad(m)}:${pad(s)}`;
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad(m)}:${pad(s)}`;
}

let _idCounter = 0;
function clientId() {
  return `c${++_idCounter}_${Date.now()}`;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RACE_STARTED":
      return { ...state, raceStatus: "running", startedAt: action.startedAt, error: null };

    case "RACE_FINISHED":
      return { ...state, raceStatus: "finished" };

    case "TAP_LAP": {
      const entries = state.entries.map((e) => {
        if (e.id !== action.entryId) return e;
        return {
          ...e,
          pendingLaps: e.pendingLaps + 1,
          debounceUntil: performance.now() + 1500,
        };
      });
      const queueItem: PendingAction = (() => {
        const entry = state.entries.find((e) => e.id === action.entryId)!;
        const confirmedLaps = entry.serverLaps.length;
        const lapNumber = confirmedLaps + entry.pendingLaps + 1;
        return {
          clientId: action.clientId,
          type: "lap",
          entryId: action.entryId,
          lapNumber,
          cumulativeElapsedMs: action.cumulativeMs,
          lapsToSail: entry.lapsToSail,
        };
      })();
      return { ...state, entries, queue: [...state.queue, queueItem] };
    }

    case "LAP_CONFIRMED": {
      const entries = state.entries.map((e) => {
        if (e.id !== action.entryId) return e;
        const newLap = {
          lapNumber: action.lapNumber,
          cumulativeElapsedMs: action.cumulativeMs,
        };
        const isLast = action.lapNumber >= action.lapsToSail;
        return {
          ...e,
          pendingLaps: Math.max(0, e.pendingLaps - 1),
          serverLaps: [...e.serverLaps, newLap],
          status: isLast ? ("FIN" as EntryStatus) : e.status,
          finishTimeMs: isLast ? action.cumulativeMs : e.finishTimeMs,
        };
      });
      return { ...state, entries, queue: state.queue.filter((q) => q.clientId !== action.clientId) };
    }

    case "SET_STATUS_OPTIMISTIC": {
      const entries = state.entries.map((e) => {
        if (e.id !== action.entryId) return e;
        return { ...e, status: action.status };
      });
      const queueItem: PendingAction = {
        clientId: action.clientId,
        type: "status",
        entryId: action.entryId,
        newStatus: action.status as Exclude<EntryStatus, "racing" | "FIN">,
      };
      return { ...state, entries, queue: [...state.queue, queueItem] };
    }

    case "STATUS_CONFIRMED":
      return { ...state, queue: state.queue.filter((q) => q.clientId !== action.clientId) };

    case "UNDO_OPTIMISTIC": {
      const entries = state.entries.map((e) => {
        if (e.id !== action.entryId) return e;
        const newLaps = e.serverLaps.slice(0, -1);
        const wasFin = e.status === "FIN";
        return {
          ...e,
          serverLaps: newLaps,
          status: wasFin ? ("racing" as EntryStatus) : e.status,
          finishTimeMs: wasFin ? null : e.finishTimeMs,
        };
      });
      const entry = state.entries.find((e) => e.id === action.entryId)!;
      const queueItem: PendingAction = {
        clientId: action.clientId,
        type: "undo",
        entryId: action.entryId,
      };
      // Only add to queue if there are server-confirmed laps to undo
      const shouldQueue = entry.serverLaps.length > 0;
      return {
        ...state,
        entries,
        queue: shouldQueue ? [...state.queue, queueItem] : state.queue,
      };
    }

    case "UNDO_CONFIRMED":
      return { ...state, queue: state.queue.filter((q) => q.clientId !== action.clientId) };

    case "ACTION_FAILED":
      // Remove failed action from queue (will be retried if still pending)
      return { ...state, queue: state.queue.filter((q) => q.clientId !== action.clientId) };

    case "TICK":
      return { ...state, clockMs: action.clockMs };

    case "NETWORK":
      return { ...state, isOnline: action.isOnline };

    case "CLEAR_DEBOUNCE": {
      const entries = state.entries.map((e) => {
        if (e.id !== action.entryId) return e;
        return { ...e, debounceUntil: null };
      });
      return { ...state, entries };
    }

    case "SET_ERROR":
      return { ...state, error: action.msg };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  raceId: string;
  raceName: string;
  raceDate: string;
  raceTime: string;
  trophies: string[];
  useBasePyOnly: boolean;
  isPursuit: boolean;
  referenceLaps: number | null;
  initialStatus: "draft" | "running" | "finished";
  initialStartedAt: string | null;
  initialEntries: InitialEntry[];
  seasonYear: number | null;
}

export function ControlClient({
  raceId,
  raceName,
  raceDate,
  raceTime,
  trophies,
  useBasePyOnly,
  isPursuit,
  referenceLaps,
  initialStatus,
  initialStartedAt,
  initialEntries,
  seasonYear,
}: Props) {
  const [state, dispatch] = useReducer(reducer, {
    raceStatus: initialStatus,
    startedAt: initialStartedAt,
    entries: initialEntries.map((e) => ({
      ...e,
      pendingLaps: 0,
      debounceUntil: null,
    })),
    queue: [],
    isOnline: true,
    clockMs: 0,
    error: null,
  });

  // Monotonic clock anchor: performance.now() value corresponding to race start
  const perfAnchorRef = useRef<number | null>(null);
  // Prevent concurrent queue processing
  const processingRef = useRef(false);
  // Dispatch ref so effects don't need dispatch in deps
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // ── Initialise performance anchor ─────────────────────────────────────────
  useEffect(() => {
    if (state.startedAt && perfAnchorRef.current === null) {
      const serverMs = new Date(state.startedAt).getTime();
      const initialElapsed = Date.now() - serverMs;
      perfAnchorRef.current = performance.now() - initialElapsed;
    }
  }, [state.startedAt]);

  // ── Clock tick every second ────────────────────────────────────────────────
  useEffect(() => {
    if (state.raceStatus !== "running") return;
    const tick = () => {
      const anchor = perfAnchorRef.current;
      if (anchor !== null) {
        dispatchRef.current({ type: "TICK", clockMs: performance.now() - anchor });
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [state.raceStatus]);

  // ── Debounce clear timers ─────────────────────────────────────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const e of state.entries) {
      if (e.debounceUntil !== null) {
        const remaining = e.debounceUntil - performance.now();
        if (remaining > 0) {
          const id = setTimeout(
            () => dispatchRef.current({ type: "CLEAR_DEBOUNCE", entryId: e.id }),
            remaining
          );
          timers.push(id);
        } else {
          dispatchRef.current({ type: "CLEAR_DEBOUNCE", entryId: e.id });
        }
      }
    }
    return () => timers.forEach(clearTimeout);
    // Only run when debounceUntil values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.entries.map((e) => e.debounceUntil).join(",")]);

  // ── Network detection ──────────────────────────────────────────────────────
  useEffect(() => {
    dispatchRef.current({ type: "NETWORK", isOnline: navigator.onLine });
    const onOnline = () => {
      dispatchRef.current({ type: "NETWORK", isOnline: true });
      processQueue();
    };
    const onOffline = () => dispatchRef.current({ type: "NETWORK", isOnline: false });
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Queue processor ────────────────────────────────────────────────────────
  // We hold a ref to the latest queue/state so processQueue can read it
  const stateRef = useRef(state);
  stateRef.current = state;

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    const { queue, isOnline } = stateRef.current;
    if (!isOnline || queue.length === 0) return;

    processingRef.current = true;
    const action = queue[0];
    try {
      if (action.type === "lap") {
        const res = await recordLap(
          action.entryId,
          raceId,
          action.lapNumber,
          action.cumulativeElapsedMs,
          action.lapsToSail
        );
        if ("error" in res) throw new Error(res.error);
        dispatchRef.current({
          type: "LAP_CONFIRMED",
          clientId: action.clientId,
          entryId: action.entryId,
          lapNumber: action.lapNumber,
          cumulativeMs: action.cumulativeElapsedMs,
          lapsToSail: action.lapsToSail,
        });
      } else if (action.type === "status") {
        const res = await setEntryStatus(action.entryId, raceId, action.newStatus);
        if ("error" in res) throw new Error(res.error);
        dispatchRef.current({
          type: "STATUS_CONFIRMED",
          clientId: action.clientId,
          entryId: action.entryId,
          newStatus: action.newStatus,
        });
      } else if (action.type === "undo") {
        const res = await undoLastLap(action.entryId, raceId);
        if ("error" in res) throw new Error(res.error);
        dispatchRef.current({
          type: "UNDO_CONFIRMED",
          clientId: action.clientId,
          entryId: action.entryId,
        });
      }
    } catch (err) {
      // Leave in queue for retry on next network event
      console.warn("Queue action failed, will retry:", err);
    } finally {
      processingRef.current = false;
      // If there are more items in the queue, process next
      if (stateRef.current.queue.length > 1) {
        setTimeout(processQueue, 50);
      }
    }
  }, [raceId]);

  // Process queue whenever it grows or we come back online
  useEffect(() => {
    if (state.queue.length > 0 && state.isOnline) {
      processQueue();
    }
  }, [state.queue.length, state.isOnline, processQueue]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  async function handleStartRace() {
    setStarting(true);
    const res = await startRace(raceId);
    setStarting(false);
    if ("error" in res) {
      dispatch({ type: "SET_ERROR", msg: res.error });
      return;
    }
    // Anchor the perf clock to the server timestamp
    const serverMs = new Date(res.startedAt).getTime();
    perfAnchorRef.current = performance.now() - (Date.now() - serverMs);
    dispatch({ type: "RACE_STARTED", startedAt: res.startedAt });
  }

  function handleTapLap(entryId: string) {
    const anchor = perfAnchorRef.current;
    if (anchor === null) return;
    const cumulativeMs = Math.round(performance.now() - anchor);
    const id = clientId();
    dispatch({ type: "TAP_LAP", entryId, cumulativeMs, clientId: id });
  }

  function handleSetStatus(
    entryId: string,
    status: Exclude<EntryStatus, "racing" | "FIN">
  ) {
    const id = clientId();
    dispatch({ type: "SET_STATUS_OPTIMISTIC", entryId, status, clientId: id });
  }

  function handleUndo(entryId: string) {
    const id = clientId();
    dispatch({ type: "UNDO_OPTIMISTIC", entryId, clientId: id });
  }

  async function handleFinishRace() {
    setFinishing(true);
    const res = await finishRace(raceId);
    setFinishing(false);
    if ("error" in res) {
      dispatch({ type: "SET_ERROR", msg: res.error });
      return;
    }
    dispatch({ type: "RACE_FINISHED" });
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const allDone = state.entries.length > 0 &&
    state.entries.every((e) => e.status !== "racing");

  const canFinish = state.raceStatus === "running" && allDone && state.queue.length === 0;

  const pendingCount = state.queue.length;

  // Split entries: racing on top, done at bottom
  const racingEntries = state.entries.filter((e) => e.status === "racing");
  const doneEntries = state.entries.filter((e) => e.status !== "racing");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-white">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-neutral-900 border-b border-neutral-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Race info */}
          <div className="flex-1 min-w-0">
            {seasonYear && (
              <Link
                href={`/admin/seasons/${seasonYear}`}
                className="text-xs text-neutral-500 hover:text-neutral-300"
              >
                ← {seasonYear} Season
              </Link>
            )}
            <p className="font-bold text-white leading-tight truncate">{raceName}</p>
            <p className="text-xs text-neutral-400">
              {raceDate} · {raceTime}
              {trophies.length > 0 && (
                <span className="hidden sm:inline"> · {trophies.join(", ")}</span>
              )}
            </p>
          </div>

          {/* Clock */}
          {state.raceStatus === "running" && (
            <div className="text-2xl font-mono font-bold text-white tabular-nums">
              {formatClock(state.clockMs)}
            </div>
          )}

          {/* Connection badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {pendingCount > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs text-amber-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                {pendingCount} pending
              </span>
            ) : !state.isOnline ? (
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-xs text-red-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
                offline
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs text-green-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                live
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Error banner */}
      {state.error && (
        <div className="bg-red-900 border-b border-red-700 px-4 py-3 text-sm text-red-200 flex items-center justify-between max-w-xl mx-auto w-full">
          <span>{state.error}</span>
          <button
            onClick={() => dispatch({ type: "CLEAR_ERROR" })}
            className="ml-4 text-red-300 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      <main className="flex-1 max-w-xl mx-auto w-full px-3 py-4 flex flex-col gap-4">

        {/* ── DRAFT: pre-start ── */}
        {state.raceStatus === "draft" && (
          <>
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5">
              <p className="text-sm text-neutral-400 mb-1">Entrants ({state.entries.length})</p>
              {state.entries.length === 0 ? (
                <p className="text-neutral-500 text-sm">
                  No entrants yet.{" "}
                  <Link href={`/race/${raceId}/setup`} className="text-white underline">
                    Set up this race first.
                  </Link>
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {state.entries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-neutral-800 last:border-0">
                      <span className="font-medium text-white">{e.racerName}</span>
                      <span className="text-neutral-400">
                        {e.sailNumber} · {e.className} · {e.lapsToSail} laps
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {useBasePyOnly && (
              <p className="text-xs text-amber-400 text-center">Base PY only race</p>
            )}
            {isPursuit && (
              <p className="text-xs text-blue-400 text-center">Pursuit race — manual timing</p>
            )}

            <button
              onClick={handleStartRace}
              disabled={starting || state.entries.length === 0}
              className="w-full rounded-2xl bg-green-500 hover:bg-green-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-2xl py-6 transition-all select-none"
              style={{ minHeight: 80 }}
            >
              {starting ? "Starting…" : "START RACE"}
            </button>
          </>
        )}

        {/* ── RUNNING: entry cards ── */}
        {state.raceStatus === "running" && (
          <>
            {racingEntries.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                clockMs={state.clockMs}
                referenceLaps={referenceLaps}
                onLap={handleTapLap}
                onStatus={handleSetStatus}
                onUndo={handleUndo}
                pendingCount={state.queue.filter((q) => q.entryId === e.id).length}
              />
            ))}

            {doneEntries.length > 0 && (
              <>
                <p className="text-xs text-neutral-500 uppercase tracking-wider text-center">
                  Finished / retired
                </p>
                {doneEntries.map((e) => (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    clockMs={state.clockMs}
                    referenceLaps={referenceLaps}
                    onLap={handleTapLap}
                    onStatus={handleSetStatus}
                    onUndo={handleUndo}
                    pendingCount={state.queue.filter((q) => q.entryId === e.id).length}
                  />
                ))}
              </>
            )}

            {canFinish && (
              <button
                onClick={handleFinishRace}
                disabled={finishing}
                className="w-full rounded-2xl bg-white hover:bg-neutral-100 active:scale-95 disabled:opacity-50 text-neutral-900 font-bold text-xl py-5 mt-2 transition-all select-none"
                style={{ minHeight: 64 }}
              >
                {finishing ? "Finishing…" : "FINISH RACE"}
              </button>
            )}

            {allDone && !canFinish && pendingCount > 0 && (
              <p className="text-center text-sm text-amber-300">
                Waiting for {pendingCount} pending write{pendingCount !== 1 ? "s" : ""} before finishing…
              </p>
            )}
          </>
        )}

        {/* ── FINISHED ── */}
        {state.raceStatus === "finished" && (
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-6 text-center">
            <p className="text-2xl font-bold text-white mb-2">Race complete</p>
            <p className="text-neutral-400 text-sm mb-6">
              Results computation is queued (Phase 8).
            </p>
            <div className="flex flex-col gap-2">
              {doneEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{e.racerName}</span>
                  <span className={`font-mono ${e.status === "FIN" ? "text-green-400" : "text-neutral-400"}`}>
                    {e.status === "FIN" && e.finishTimeMs !== null
                      ? formatElapsed(e.finishTimeMs)
                      : e.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: EntryState;
  clockMs: number;
  referenceLaps: number | null;
  onLap: (entryId: string) => void;
  onStatus: (entryId: string, status: Exclude<EntryStatus, "racing" | "FIN">) => void;
  onUndo: (entryId: string) => void;
  pendingCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  FIN: "FIN",
  DNF: "DNF",
  DNS: "DNS",
  DSQ: "DSQ",
  RET: "RET",
  OCS: "OCS",
  DNC: "DNC",
};

function EntryCard({
  entry,
  clockMs,
  referenceLaps,
  onLap,
  onStatus,
  onUndo,
  pendingCount,
}: EntryCardProps) {
  const [confirmUndo, setConfirmUndo] = useState(false);

  const confirmedLaps = entry.serverLaps.length;
  const totalLaps = confirmedLaps + entry.pendingLaps;
  const isDone = entry.status !== "racing";
  const isDebounced =
    entry.debounceUntil !== null &&
    performance.now() < entry.debounceUntil;

  const lastLapMs =
    entry.serverLaps.length > 0
      ? entry.serverLaps[entry.serverLaps.length - 1].cumulativeElapsedMs
      : null;

  const displayElapsedMs = isDone
    ? entry.finishTimeMs ?? lastLapMs ?? null
    : clockMs;

  const debounceKey = entry.debounceUntil ?? 0;

  return (
    <div
      className={`rounded-2xl border flex items-stretch overflow-hidden transition-opacity ${
        isDone
          ? "border-neutral-700 bg-neutral-900 opacity-60"
          : pendingCount > 0
          ? "border-amber-700 bg-neutral-900"
          : "border-neutral-700 bg-neutral-900"
      }`}
    >
      {/* ── Left: racer info ── */}
      <div className="flex-1 flex flex-col justify-center px-4 py-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white leading-tight truncate">
            {entry.racerName}
          </span>
          {pendingCount > 0 && (
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          )}
        </div>
        <span className="text-sm text-neutral-400">
          {entry.sailNumber} · {entry.className}
        </span>

        {/* Lap progress / status */}
        {isDone ? (
          <span
            className={`mt-1 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-bold ${
              entry.status === "FIN"
                ? "bg-green-900 text-green-300"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {STATUS_LABELS[entry.status] ?? entry.status}
            {entry.status === "FIN" && entry.finishTimeMs !== null && (
              <span className="ml-1 font-mono font-normal">
                {formatElapsed(entry.finishTimeMs)}
              </span>
            )}
          </span>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <span className="text-sm font-mono text-neutral-300">
              {totalLaps} / {entry.lapsToSail}
            </span>
            {referenceLaps !== null && entry.lapsToSail < referenceLaps && (
              <span className="text-xs text-neutral-500">
                (pro-rated to {referenceLaps})
              </span>
            )}
            {displayElapsedMs !== null && (
              <span className="text-sm font-mono text-neutral-400">
                {formatElapsed(displayElapsedMs)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Right: LAP button + menu ── */}
      {!isDone && (
        <div className="flex items-stretch shrink-0">
          {/* LAP button with debounce ring */}
          <button
            onPointerDown={(ev) => {
              // Prevent iOS long-press context menu on the button
              ev.currentTarget.releasePointerCapture(ev.pointerId);
            }}
            onClick={() => !isDebounced && onLap(entry.id)}
            disabled={isDebounced}
            className="relative flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-900 text-white font-black text-xl select-none transition-colors focus:outline-none"
            style={{ minWidth: 80, minHeight: 80 }}
            aria-label={`Lap for ${entry.racerName}`}
          >
            {isDebounced ? (
              <svg
                key={debounceKey}
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                aria-hidden
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="6"
                  strokeDasharray="251.2"
                  strokeDashoffset="0"
                  style={{
                    transformOrigin: "50% 50%",
                    transform: "rotate(-90deg)",
                    animation: "nsc-debounce-drain 1.5s linear forwards",
                  }}
                />
              </svg>
            ) : null}
            <span className="relative z-10">LAP</span>
          </button>

          {/* Kebab menu */}
          <DropdownMenu onOpenChange={(open) => { if (!open) setConfirmUndo(false); }}>
            <DropdownMenuTrigger
              className="flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors focus:outline-none"
              style={{ minWidth: 40, minHeight: 80 }}
              aria-label="More options"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-700 text-white min-w-36">
              {/* Status options */}
              {(["DNF", "RET", "DSQ", "OCS", "DNS", "DNC"] as const).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onStatus(entry.id, s)}
                  className="text-neutral-300 hover:text-white focus:bg-neutral-800 cursor-pointer"
                >
                  {s}
                </DropdownMenuItem>
              ))}
              {confirmedLaps > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-neutral-700" />
                  {confirmUndo ? (
                    <DropdownMenuItem
                      onClick={() => { onUndo(entry.id); setConfirmUndo(false); }}
                      className="text-red-400 hover:text-red-300 focus:bg-neutral-800 cursor-pointer font-semibold"
                    >
                      Confirm undo lap {confirmedLaps}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={(e) => { e.preventDefault(); setConfirmUndo(true); }}
                      className="text-neutral-400 hover:text-white focus:bg-neutral-800 cursor-pointer"
                    >
                      Undo last lap
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Done entry: undo only via menu */}
      {isDone && entry.status === "FIN" && confirmedLaps > 0 && (
        <div className="flex items-stretch shrink-0">
          <DropdownMenu onOpenChange={(open) => { if (!open) setConfirmUndo(false); }}>
            <DropdownMenuTrigger
              className="flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-500 transition-colors focus:outline-none px-3"
              style={{ minWidth: 40, minHeight: 80 }}
              aria-label="More options"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-700 text-white min-w-36">
              {confirmUndo ? (
                <DropdownMenuItem
                  onClick={() => { onUndo(entry.id); setConfirmUndo(false); }}
                  className="text-red-400 hover:text-red-300 focus:bg-neutral-800 cursor-pointer font-semibold"
                >
                  Confirm undo lap {confirmedLaps}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => { e.preventDefault(); setConfirmUndo(true); }}
                  className="text-neutral-400 hover:text-white focus:bg-neutral-800 cursor-pointer"
                >
                  Undo last lap
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
