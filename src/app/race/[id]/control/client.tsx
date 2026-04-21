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
  startCountdown,
  abandonCountdown,
  transitionToRunning,
  startRace,
  recordLap,
  setEntryStatus,
  undoLastLap,
  finishRace,
} from "./actions";
import { primeAudio, isAudioPrimed, playHorn } from "@/lib/audio/horn";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTDOWN_DURATION_MS = 10 * 60 * 1000;
// Horn at T-10:00 (fired immediately on start), T-5:00, T-1:00, T-0:00
const HORN_MARKS_MS = [5 * 60 * 1000, 60 * 1000, 0];

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
  pendingLaps: number;
  debounceUntil: number | null;
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
  countdownStartedAt: string | null;
  startedAt: string | null;
  entries: EntryState[];
  queue: PendingAction[];
  isOnline: boolean;
  clockMs: number;
  countdownMs: number;
  error: string | null;
}

type Action =
  | { type: "COUNTDOWN_STARTED"; countdownStartedAt: string }
  | { type: "COUNTDOWN_ABANDONED" }
  | { type: "COUNTDOWN_TICK"; countdownMs: number }
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

function formatCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSec = Math.ceil(clamped / 1000);
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
    case "COUNTDOWN_STARTED":
      return {
        ...state,
        countdownStartedAt: action.countdownStartedAt,
        countdownMs: COUNTDOWN_DURATION_MS,
        error: null,
      };

    case "COUNTDOWN_ABANDONED":
      return { ...state, countdownStartedAt: null, countdownMs: 0 };

    case "COUNTDOWN_TICK":
      return { ...state, countdownMs: action.countdownMs };

    case "RACE_STARTED":
      return {
        ...state,
        raceStatus: "running",
        startedAt: action.startedAt,
        countdownStartedAt: null,
        error: null,
      };

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
  initialCountdownStartedAt: string | null;
  initialEntries: InitialEntry[];
  seasonYear: number | null;
}

function deriveInitialCountdownMs(countdownStartedAt: string | null): number {
  if (!countdownStartedAt) return 0;
  const elapsed = Date.now() - new Date(countdownStartedAt).getTime();
  return Math.max(0, COUNTDOWN_DURATION_MS - elapsed);
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
  initialCountdownStartedAt,
  initialEntries,
  seasonYear,
}: Props) {
  const [state, dispatch] = useReducer(reducer, {
    raceStatus: initialStatus,
    countdownStartedAt: initialCountdownStartedAt,
    startedAt: initialStartedAt,
    entries: initialEntries.map((e) => ({
      ...e,
      pendingLaps: 0,
      debounceUntil: null,
    })),
    queue: [],
    isOnline: true,
    clockMs: 0,
    countdownMs: deriveInitialCountdownMs(initialCountdownStartedAt),
    error: null,
  });

  const isCountdown = state.raceStatus === "draft" && state.countdownStartedAt !== null;

  const perfAnchorRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const hornsFiredRef = useRef(new Set<number>());
  const transitioningRef = useRef(false);

  // ── Audio prime state ──────────────────────────────────────────────────────
  const [audioPrimed, setAudioPrimed] = useState(false);

  function ensureAudio() {
    if (!isAudioPrimed()) {
      primeAudio();
      setAudioPrimed(true);
    }
  }

  // ── Screen Wake Lock ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state.raceStatus !== "running" && !isCountdown) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let wakeLock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        wakeLock = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request("screen");
      } catch {
        // Not supported or denied
      }
    }

    acquire();

    function onVisibility() {
      if (document.visibilityState === "visible") acquire();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      wakeLock?.release().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.raceStatus, isCountdown]);

  // ── Initialise performance anchor for race clock ───────────────────────────
  useEffect(() => {
    if (state.startedAt && perfAnchorRef.current === null) {
      const serverMs = new Date(state.startedAt).getTime();
      const initialElapsed = Date.now() - serverMs;
      perfAnchorRef.current = performance.now() - initialElapsed;
    }
  }, [state.startedAt]);

  // ── Race clock tick ────────────────────────────────────────────────────────
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

  // ── Countdown tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isCountdown || !state.countdownStartedAt) return;

    const countdownStartedAt = state.countdownStartedAt;

    function computeRemaining() {
      const elapsed = Date.now() - new Date(countdownStartedAt).getTime();
      return Math.max(0, COUNTDOWN_DURATION_MS - elapsed);
    }

    const tick = () => {
      const remaining = computeRemaining();
      dispatchRef.current({ type: "COUNTDOWN_TICK", countdownMs: remaining });

      // Fire horns at marks
      for (const mark of HORN_MARKS_MS) {
        if (!hornsFiredRef.current.has(mark) && remaining <= mark + 800) {
          hornsFiredRef.current.add(mark);
          playHorn();
        }
      }

      // Transition to running at T-0
      if (remaining === 0 && !transitioningRef.current) {
        transitioningRef.current = true;
        transitionToRunning(raceId).then((res) => {
          if ("error" in res) {
            dispatchRef.current({ type: "SET_ERROR", msg: res.error });
          } else {
            const serverMs = new Date(res.startedAt).getTime();
            perfAnchorRef.current = performance.now() - (Date.now() - serverMs);
            dispatchRef.current({ type: "RACE_STARTED", startedAt: res.startedAt });
          }
          transitioningRef.current = false;
        });
      }
    };

    const id = setInterval(tick, 200);
    tick();
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCountdown, state.countdownStartedAt, raceId]);

  // ── Re-sync countdown on tab focus ────────────────────────────────────────
  useEffect(() => {
    if (!isCountdown || !state.countdownStartedAt) return;
    const countdownStartedAt = state.countdownStartedAt;

    function onVisibility() {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - new Date(countdownStartedAt).getTime();
        const remaining = Math.max(0, COUNTDOWN_DURATION_MS - elapsed);
        dispatchRef.current({ type: "COUNTDOWN_TICK", countdownMs: remaining });
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCountdown, state.countdownStartedAt]);

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
      console.warn("Queue action failed, will retry:", err);
    } finally {
      processingRef.current = false;
      if (stateRef.current.queue.length > 1) {
        setTimeout(processQueue, 50);
      }
    }
  }, [raceId]);

  useEffect(() => {
    if (state.queue.length > 0 && state.isOnline) {
      processQueue();
    }
  }, [state.queue.length, state.isOnline, processQueue]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const [countdownStarting, setCountdownStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [holdingAbandon, setHoldingAbandon] = useState(false);
  const [abandonProgress, setAbandonProgress] = useState(0);
  const abandonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abandonAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleStartCountdown() {
    ensureAudio();
    setCountdownStarting(true);
    const res = await startCountdown(raceId);
    setCountdownStarting(false);
    if ("error" in res) {
      dispatch({ type: "SET_ERROR", msg: res.error });
      return;
    }
    hornsFiredRef.current = new Set(); // reset horn tracking
    transitioningRef.current = false;
    playHorn(); // T-10 signal
    dispatch({ type: "COUNTDOWN_STARTED", countdownStartedAt: res.countdownStartedAt });
  }

  async function handleStartImmediately() {
    ensureAudio();
    const res = await startRace(raceId);
    if ("error" in res) {
      dispatch({ type: "SET_ERROR", msg: res.error });
      return;
    }
    const serverMs = new Date(res.startedAt).getTime();
    perfAnchorRef.current = performance.now() - (Date.now() - serverMs);
    playHorn();
    dispatch({ type: "RACE_STARTED", startedAt: res.startedAt });
  }

  function handleAbandonStart() {
    setHoldingAbandon(true);
    setAbandonProgress(0);

    const startTime = Date.now();
    abandonAnimRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startTime) / 2000) * 100);
      setAbandonProgress(pct);
    }, 30);

    abandonTimerRef.current = setTimeout(async () => {
      clearInterval(abandonAnimRef.current!);
      setHoldingAbandon(false);
      setAbandonProgress(0);
      const res = await abandonCountdown(raceId);
      if ("error" in res) {
        dispatch({ type: "SET_ERROR", msg: res.error });
      } else {
        hornsFiredRef.current = new Set();
        dispatch({ type: "COUNTDOWN_ABANDONED" });
      }
    }, 2000);
  }

  function handleAbandonEnd() {
    if (abandonTimerRef.current) {
      clearTimeout(abandonTimerRef.current);
      abandonTimerRef.current = null;
    }
    if (abandonAnimRef.current) {
      clearInterval(abandonAnimRef.current);
      abandonAnimRef.current = null;
    }
    setHoldingAbandon(false);
    setAbandonProgress(0);
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

  const allDone =
    state.entries.length > 0 &&
    state.entries.every((e) => e.status !== "racing");

  const canFinish = state.raceStatus === "running" && allDone && state.queue.length === 0;

  const pendingCount = state.queue.length;

  const racingEntries = state.entries.filter((e) => e.status === "racing");
  const doneEntries = state.entries.filter((e) => e.status !== "racing");

  // Countdown colour based on remaining time
  function countdownColorClass() {
    const ms = state.countdownMs;
    if (ms <= 10000) return "text-red-400";
    if (ms <= 60000) return "text-amber-400";
    if (ms <= 5 * 60 * 1000) return "text-blue-300";
    return "text-white";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white overflow-auto select-none`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      onClick={ensureAudio}
    >
      {/* ── Sticky header ── */}
      <header
        className="sticky top-0 z-20 bg-neutral-900 border-b border-neutral-800 px-4 py-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
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

          {/* Race clock (running only) */}
          {state.raceStatus === "running" && (
            <div className="font-mono font-bold text-white tabular-nums text-2xl md:text-3xl">
              {formatClock(state.clockMs)}
            </div>
          )}

          {/* Connection badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!audioPrimed && (isCountdown || state.raceStatus === "running") ? (
              <span className="flex items-center gap-1 rounded-full bg-neutral-700/60 border border-neutral-600 px-2 py-0.5 text-xs text-neutral-400">
                tap to enable audio
              </span>
            ) : pendingCount > 0 ? (
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
        {state.raceStatus === "draft" && !isCountdown && (
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
              onClick={handleStartCountdown}
              disabled={countdownStarting || state.entries.length === 0}
              className="w-full rounded-2xl bg-[#0a1b3d] hover:bg-[#0d2450] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-2xl py-6 transition-all select-none border border-blue-900"
              style={{ minHeight: 80 }}
            >
              {countdownStarting ? "Starting…" : "START COUNTDOWN"}
            </button>

            <button
              onClick={handleStartImmediately}
              disabled={state.entries.length === 0}
              className="w-full rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-400 hover:text-white font-medium text-sm py-3 transition-all select-none"
            >
              Start race immediately (no countdown)
            </button>
          </>
        )}

        {/* ── COUNTDOWN ── */}
        {state.raceStatus === "draft" && isCountdown && (
          <>
            {/* Big countdown display */}
            <div className="flex flex-col items-center justify-center pt-6 pb-4">
              <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">
                Race starts in
              </p>
              <div
                className={`font-mono font-black tabular-nums transition-colors duration-500 ${countdownColorClass()} ${
                  state.countdownMs <= 10000 ? "animate-pulse" : ""
                }`}
                style={{ fontSize: "clamp(4rem, 20vw, 8rem)", lineHeight: 1 }}
              >
                {formatCountdown(state.countdownMs)}
              </div>

              {/* Signal timeline */}
              <div className="mt-8 w-full max-w-xs">
                <CountdownTimeline countdownMs={state.countdownMs} />
              </div>
            </div>

            {/* Entrant list */}
            <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4">
              <p className="text-xs text-neutral-500 mb-2">
                {state.entries.length} entrant{state.entries.length !== 1 ? "s" : ""}
              </p>
              <ul className="flex flex-col gap-1">
                {state.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-neutral-800 last:border-0">
                    <span className="font-medium text-white">{e.racerName}</span>
                    <span className="text-neutral-500">{e.sailNumber} · {e.className}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Abandon — hold to confirm */}
            <div className="mt-auto pt-2">
              <div className="relative overflow-hidden rounded-xl">
                {/* Progress fill */}
                <div
                  className="absolute inset-0 bg-red-900/60 transition-none rounded-xl"
                  style={{ width: `${abandonProgress}%` }}
                />
                <button
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handleAbandonStart(); }}
                  onPointerUp={handleAbandonEnd}
                  onPointerLeave={handleAbandonEnd}
                  onPointerCancel={handleAbandonEnd}
                  className="relative z-10 w-full rounded-xl border border-red-900 bg-transparent text-red-500 hover:text-red-400 font-medium text-sm py-3 transition-colors select-none"
                >
                  {holdingAbandon ? "Release to cancel…" : "Hold to abandon countdown"}
                </button>
              </div>
            </div>
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
            <p className="text-neutral-400 text-sm mb-4">
              Results have been computed.
            </p>
            <Link
              href={`/race/${raceId}/results`}
              className="inline-block mb-6 rounded-xl bg-white px-6 py-3 font-bold text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              View results →
            </Link>
            <div className="flex flex-col gap-2">
              {doneEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{e.racerName}</span>
                  <span className={`font-mono tabular-nums ${e.status === "FIN" ? "text-green-400" : "text-neutral-400"}`}>
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

// ─── Countdown Timeline ───────────────────────────────────────────────────────

interface TimelineProps {
  countdownMs: number;
}

const MARKS = [
  { label: "T−5:00", ms: 5 * 60 * 1000 },
  { label: "T−1:00", ms: 60 * 1000 },
  { label: "T−0 GO", ms: 0 },
];

function CountdownTimeline({ countdownMs }: TimelineProps) {
  const progress = 1 - countdownMs / COUNTDOWN_DURATION_MS;

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative h-1 bg-neutral-800 rounded-full mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-200"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
        {MARKS.map(({ ms }) => {
          const pos = 1 - ms / COUNTDOWN_DURATION_MS;
          return (
            <div
              key={ms}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-neutral-700 transition-colors duration-300"
              style={{
                left: `calc(${pos * 100}% - 4px)`,
                background: countdownMs <= ms ? "white" : "rgb(38,38,38)",
              }}
            />
          );
        })}
      </div>
      {/* Labels */}
      <div className="relative h-4">
        {MARKS.map(({ label, ms }) => {
          const pos = 1 - ms / COUNTDOWN_DURATION_MS;
          const passed = countdownMs <= ms;
          return (
            <span
              key={ms}
              className={`absolute text-xs transition-colors duration-300 -translate-x-1/2 ${
                passed ? "text-white" : "text-neutral-600"
              }`}
              style={{ left: `${pos * 100}%` }}
            >
              {label}
            </span>
          );
        })}
      </div>
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
      <div className="flex-1 flex flex-col justify-center px-4 py-4 min-w-0" style={{ minHeight: 88 }}>
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
              <span className="ml-1 font-mono font-normal tabular-nums">
                {formatElapsed(entry.finishTimeMs)}
              </span>
            )}
          </span>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <span className="text-sm font-mono tabular-nums text-neutral-300">
              {totalLaps} / {entry.lapsToSail}
            </span>
            {referenceLaps !== null && entry.lapsToSail < referenceLaps && (
              <span className="text-xs text-neutral-500">
                (pro-rated to {referenceLaps})
              </span>
            )}
            {displayElapsedMs !== null && (
              <span className="text-sm font-mono tabular-nums text-neutral-400">
                {formatElapsed(displayElapsedMs)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Right: LAP button + menu ── */}
      {!isDone && (
        <div className="flex items-stretch shrink-0">
          <button
            onPointerDown={(ev) => {
              ev.currentTarget.releasePointerCapture(ev.pointerId);
            }}
            onClick={() => !isDebounced && onLap(entry.id)}
            disabled={isDebounced}
            className="relative flex items-center justify-center bg-[#0a1b3d] hover:bg-[#0d2450] active:bg-[#071228] disabled:bg-neutral-800 text-white font-black text-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{ minWidth: 88, minHeight: 88 }}
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

// TypeScript: WakeLock types may not be in older lib.dom.d.ts
interface WakeLock {
  request(type: "screen"): Promise<WakeLockSentinel>;
}
interface WakeLockSentinel {
  release(): Promise<void>;
}
