"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { addEntry } from "./actions";

interface Racer {
  id: string;
  full_name: string;
  display_name: string;
  personal_py_delta: number;
  default_boat_id: string | null;
  boats: { sail_number: string; boat_classes: { name: string } | null } | null;
}

interface Props {
  raceId: string;
  racers: Racer[];
  enteredRacerIds: Set<string>;
  locked: boolean;
}

export function RacerPicker({ raceId, racers, enteredRacerIds, locked }: Props) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [state, formAction] = useActionState(addEntry, null);

  const filtered = racers.filter((r) =>
    r.full_name.toLowerCase().includes(query.toLowerCase()) ||
    r.display_name.toLowerCase().includes(query.toLowerCase())
  );

  if (locked) return null;

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Search racers…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-xs"
      />

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100 max-h-80 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-3 text-sm text-neutral-400">No racers found.</p>
        )}
        {filtered.map((r) => {
          const already = enteredRacerIds.has(r.id);
          return (
            <form
              key={r.id}
              action={formAction}
              onSubmit={() => setPendingId(r.id)}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50"
            >
              <input type="hidden" name="race_id" value={raceId} />
              <input type="hidden" name="racer_id" value={r.id} />

              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-900">
                  {r.full_name}
                  {r.display_name !== r.full_name && (
                    <span className="ml-2 text-xs text-neutral-400">
                      ({r.display_name})
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-500">
                  {r.boats?.sail_number ?? "no boat"} ·{" "}
                  {r.boats?.boat_classes?.name ?? "no class"}
                  {r.personal_py_delta !== 0 && (
                    <span className="ml-1 text-neutral-400">
                      · PY delta {r.personal_py_delta > 0 ? "+" : ""}
                      {r.personal_py_delta}
                    </span>
                  )}
                </span>
              </div>

              <button
                type="submit"
                disabled={already || pendingId === r.id}
                className={`ml-4 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  already
                    ? "bg-neutral-100 text-neutral-400 cursor-default"
                    : "bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50"
                }`}
              >
                {already ? "Added" : "+ Add"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
