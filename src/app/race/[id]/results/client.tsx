"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { awardTrophy, undoAward } from "./actions";

// ─── Copy link button ─────────────────────────────────────────────────────────

export function CopyLinkButton() {
  const [busy, setBusy] = useState(false);

  async function handleCopy() {
    setBusy(true);
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // iOS Safari fallback
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    toast.success("Link copied");
    setBusy(false);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={busy}
      className="no-print inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
      Share link
    </button>
  );
}

// ─── Trophy section ───────────────────────────────────────────────────────────

export interface RaceTrophy {
  trophyId: string;
  name: string;
}

export interface FinishedEntry {
  entryId: string;
  racerId: string;
  racerName: string;
  positionOverall: number;
}

export interface ExistingAward {
  awardId: string;
  trophyId: string;
  racerId: string;
  racerName: string;
}

interface TrophySectionProps {
  raceId: string;
  trophies: RaceTrophy[];
  finishedEntries: FinishedEntry[]; // sorted by position_overall ascending
  initialAwards: ExistingAward[];
}

interface AwardState {
  awardId: string;
  trophyId: string;
  racerId: string;
  racerName: string;
}

export function TrophySection({
  raceId,
  trophies,
  finishedEntries,
  initialAwards,
}: TrophySectionProps) {
  const [awards, setAwards] = useState<AwardState[]>(initialAwards);
  const [overrides, setOverrides] = useState<Record<string, string>>({}); // trophyId → racerId
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const awardedRacerIds = new Set(awards.map((a) => a.racerId));

  // Cascade Rule A: highest-ranked FIN racer not yet awarded any trophy this race
  function cascadeProposal(trophyId: string): string | null {
    const alreadyAwardedInThisRace = new Set(
      awards.filter((a) => a.trophyId !== trophyId).map((a) => a.racerId)
    );
    // Exclude racer already holding THIS trophy
    const thisAward = awards.find((a) => a.trophyId === trophyId);
    const candidate = finishedEntries.find(
      (e) =>
        !alreadyAwardedInThisRace.has(e.racerId) &&
        (!thisAward || e.racerId !== thisAward.racerId)
    );
    return candidate?.racerId ?? null;
  }

  const handleAward = useCallback(
    async (trophyId: string, racerId: string) => {
      setPending((p) => ({ ...p, [trophyId]: true }));
      setErrors((e) => ({ ...e, [trophyId]: "" }));

      const result = await awardTrophy(raceId, trophyId, racerId);

      if ("error" in result) {
        setErrors((e) => ({ ...e, [trophyId]: result.error }));
      } else {
        const entry = finishedEntries.find((e) => e.racerId === racerId);
        setAwards((prev) => [
          ...prev.filter((a) => a.trophyId !== trophyId),
          {
            awardId: result.awardId,
            trophyId,
            racerId,
            racerName: entry?.racerName ?? racerId,
          },
        ]);
        setOverrides((o) => { const n = { ...o }; delete n[trophyId]; return n; });
      }

      setPending((p) => ({ ...p, [trophyId]: false }));
    },
    [raceId, finishedEntries]
  );

  const handleUndo = useCallback(
    async (trophyId: string, awardId: string) => {
      setPending((p) => ({ ...p, [trophyId]: true }));
      setErrors((e) => ({ ...e, [trophyId]: "" }));

      const result = await undoAward(awardId, raceId);

      if ("error" in result) {
        setErrors((e) => ({ ...e, [trophyId]: result.error }));
      } else {
        setAwards((prev) => prev.filter((a) => a.trophyId !== trophyId));
      }

      setPending((p) => ({ ...p, [trophyId]: false }));
    },
    [raceId]
  );

  const allConfirmed = trophies.length > 0 && trophies.every((t) => awards.some((a) => a.trophyId === t.trophyId));

  if (trophies.length === 0) return null;

  return (
    <div className="no-print mt-8 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-neutral-900">
        Trophy Awards
      </h2>

      {allConfirmed && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          All trophies awarded.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {trophies.map((trophy) => {
          const award = awards.find((a) => a.trophyId === trophy.trophyId);
          const isBusy = pending[trophy.trophyId] ?? false;
          const err = errors[trophy.trophyId];
          const proposedRacerId =
            overrides[trophy.trophyId] ?? cascadeProposal(trophy.trophyId);
          const proposedEntry = finishedEntries.find(
            (e) => e.racerId === proposedRacerId
          );

          return (
            <div
              key={trophy.trophyId}
              className="flex flex-col gap-2 rounded-md border border-neutral-100 bg-neutral-50 p-3"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-neutral-800 text-sm">
                  {trophy.name}
                </span>

                {award ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-700 font-medium">
                      {award.racerName}
                    </span>
                    <button
                      onClick={() => handleUndo(trophy.trophyId, award.awardId)}
                      disabled={isBusy}
                      className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Undo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                        disabled={isBusy}
                      >
                        {proposedEntry
                          ? `${proposedEntry.racerName} (P${proposedEntry.positionOverall})`
                          : "Select racer"}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {finishedEntries.map((e) => (
                          <DropdownMenuItem
                            key={e.racerId}
                            onSelect={() =>
                              setOverrides((o) => ({
                                ...o,
                                [trophy.trophyId]: e.racerId,
                              }))
                            }
                          >
                            P{e.positionOverall} {e.racerName}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      size="sm"
                      disabled={isBusy || !proposedRacerId}
                      onClick={() =>
                        proposedRacerId &&
                        handleAward(trophy.trophyId, proposedRacerId)
                      }
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </div>

              {err && <p className="text-xs text-red-600">{err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
