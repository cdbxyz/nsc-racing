"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/actions/toast";
import { resetSeasonDeltas } from "./actions";

// ─── History row types ────────────────────────────────────────────────────────

export interface HistoryRow {
  id: string;
  createdAt: string;
  pyBefore: number;
  pyAfter: number;
  reason: string | null;
  trophyName: string | null;
  raceName: string | null;
  raceDate: string | null;
}

export interface RacerRow {
  id: string;
  fullName: string;
  displayName: string;
  boatSailNumber: string | null;
  className: string | null;
  basePy: number | null;
  personalPyDelta: number;
  trophiesThisSeason: number;
  history: HistoryRow[];
}

// ─── Expandable racer row ─────────────────────────────────────────────────────

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-neutral-400 py-2">No history entries.</p>;
  }
  return (
    <table className="w-full text-xs mt-2">
      <thead>
        <tr className="text-neutral-400 border-b border-neutral-100">
          <th className="pb-1 text-left font-medium">Date</th>
          <th className="pb-1 text-left font-medium">Race / Trophy</th>
          <th className="pb-1 text-right font-medium">PY before</th>
          <th className="pb-1 text-right font-medium">PY after</th>
          <th className="pb-1 text-left font-medium pl-3">Reason</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-neutral-50 last:border-0">
            <td className="py-1.5 pr-3 text-neutral-400 whitespace-nowrap tabular-nums">
              {r.raceDate ?? r.createdAt.slice(0, 10)}
            </td>
            <td className="py-1.5 pr-3 text-neutral-700">
              {r.trophyName ?? r.raceName ?? "—"}
            </td>
            <td className="py-1.5 pr-3 text-right tabular-nums text-neutral-600">
              {r.pyBefore > 0 ? `+${r.pyBefore}` : r.pyBefore}
            </td>
            <td className="py-1.5 text-right tabular-nums text-neutral-900 font-medium">
              {r.pyAfter > 0 ? `+${r.pyAfter}` : r.pyAfter}
            </td>
            <td className="py-1.5 pl-3 text-neutral-400">{r.reason ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RacerHandicapRow({ racer }: { racer: RacerRow }) {
  const [expanded, setExpanded] = useState(false);
  const effectivePy =
    racer.basePy != null ? racer.basePy + racer.personalPyDelta : null;

  return (
    <>
      <tr
        className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <td className="py-2.5 px-4">
          <span className="font-medium text-neutral-900">
            {racer.displayName}
          </span>
          {racer.displayName !== racer.fullName && (
            <span className="ml-1.5 text-xs text-neutral-400">
              {racer.fullName}
            </span>
          )}
        </td>
        <td className="py-2.5 px-4 text-neutral-500 text-sm">
          {racer.boatSailNumber
            ? `${racer.boatSailNumber}${racer.className ? ` · ${racer.className}` : ""}`
            : "—"}
        </td>
        <td className="py-2.5 px-4 text-right tabular-nums text-neutral-700">
          {racer.basePy ?? "—"}
        </td>
        <td className="py-2.5 px-4 text-right tabular-nums">
          <span
            className={
              racer.personalPyDelta < 0
                ? "text-red-600 font-medium"
                : racer.personalPyDelta > 0
                  ? "text-emerald-600"
                  : "text-neutral-400"
            }
          >
            {racer.personalPyDelta > 0
              ? `+${racer.personalPyDelta}`
              : racer.personalPyDelta}
          </span>
        </td>
        <td className="py-2.5 px-4 text-right tabular-nums font-medium text-neutral-900">
          {effectivePy ?? "—"}
        </td>
        <td className="py-2.5 px-4 text-right tabular-nums text-neutral-500">
          {racer.trophiesThisSeason}
        </td>
        <td className="py-2.5 px-4 text-right">
          <span className="text-xs text-neutral-400">
            {expanded ? "▲" : "▼"}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td
            colSpan={7}
            className="px-4 pb-3 bg-neutral-50 border-b border-neutral-100"
          >
            <HistoryTable rows={racer.history} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Reset dialog ─────────────────────────────────────────────────────────────

function ResetButton({ seasonId }: { seasonId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await resetSeasonDeltas(seasonId);
      if ("error" in result) {
        toastError(result.error, result.errorId);
      } else {
        toast.success("Season deltas reset to zero.");
      }
      setConfirming(false);
    });
  }

  if (!confirming) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        Reset season deltas
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
      <span className="text-sm text-red-800">
        This will zero all personal PY deltas. Are you sure?
      </span>
      <Button
        size="sm"
        className="bg-red-600 hover:bg-red-700 text-white"
        disabled={isPending}
        onClick={handleReset}
      >
        {isPending ? "Resetting…" : "Yes, reset"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HandicapTable({
  racers,
  seasonId,
}: {
  racers: RacerRow[];
  seasonId: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">
          {racers.length} active racer{racers.length !== 1 ? "s" : ""}
        </p>
        {seasonId && <ResetButton seasonId={seasonId} />}
      </div>

      {racers.length === 0 ? (
        <p className="text-neutral-400 text-sm">No active helms.</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-xs text-neutral-400 uppercase tracking-wider">
                <th className="py-2 px-4 text-left font-medium">Helm</th>
                <th className="py-2 px-4 text-left font-medium">Boat</th>
                <th className="py-2 px-4 text-right font-medium">Base PY</th>
                <th className="py-2 px-4 text-right font-medium">Δ</th>
                <th className="py-2 px-4 text-right font-medium">Effective</th>
                <th className="py-2 px-4 text-right font-medium">Trophies</th>
                <th className="py-2 px-4" />
              </tr>
            </thead>
            <tbody>
              {racers.map((r) => (
                <RacerHandicapRow key={r.id} racer={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
