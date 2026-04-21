"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { addTrophyToRace, removeTrophyFromRace, reorderTrophy } from "../actions";

interface Trophy {
  id: string;
  name: string;
}

interface RaceTrophy {
  trophy_id: string;
  display_order: number;
  trophies: { name: string } | null;
}

interface Props {
  raceId: string;
  attached: RaceTrophy[];
  all: Trophy[];
  locked: boolean;
}

export function RaceTrophyEditor({ raceId, attached, all, locked }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sorted = [...attached].sort((a, b) => a.display_order - b.display_order);
  const attachedIds = new Set(attached.map((t) => t.trophy_id));
  const available = all.filter((t) => !attachedIds.has(t.id));

  function handleAdd(e: React.ChangeEvent<HTMLSelectElement>) {
    const trophyId = e.target.value;
    if (!trophyId) return;
    e.target.value = "";
    const nextOrder = sorted.length > 0 ? sorted[sorted.length - 1].display_order + 1 : 0;
    startTransition(async () => {
      const result = await addTrophyToRace(raceId, trophyId, nextOrder);
      setError(result?.error ?? null);
    });
  }

  function handleRemove(trophyId: string) {
    startTransition(async () => {
      const result = await removeTrophyFromRace(raceId, trophyId);
      setError(result?.error ?? null);
    });
  }

  function handleMove(trophyId: string, direction: "up" | "down") {
    const idx = sorted.findIndex((t) => t.trophy_id === trophyId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const current = sorted[idx];
    const swap = sorted[swapIdx];
    startTransition(async () => {
      await reorderTrophy(raceId, current.trophy_id, swap.display_order);
      await reorderTrophy(raceId, swap.trophy_id, current.display_order);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {sorted.map((rt, idx) => (
          <li
            key={rt.trophy_id}
            className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1 text-sm"
          >
            <span className="text-neutral-800">
              {rt.trophies?.name ?? rt.trophy_id}
            </span>
            {!locked && (
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pending || idx === 0}
                  onClick={() => handleMove(rt.trophy_id, "up")}
                  className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending || idx === sorted.length - 1}
                  onClick={() => handleMove(rt.trophy_id, "down")}
                  className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleRemove(rt.trophy_id)}
                  className="px-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove trophy"
                >
                  ×
                </button>
              </div>
            )}
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="text-xs text-neutral-400">No trophies attached.</li>
        )}
      </ul>

      {!locked && available.length > 0 && (
        <select
          onChange={handleAdd}
          disabled={pending}
          defaultValue=""
          className="h-8 rounded border border-neutral-200 bg-white px-2 text-sm text-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        >
          <option value="">Add trophy…</option>
          {available.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
