"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateReferenceLaps } from "./actions";

interface Entry {
  laps_to_sail: number | null;
  helms: { display_name: string } | null;
  boats: { sail_number: string } | null;
}

interface Props {
  raceId: string;
  referenceLaps: number | null;
  entries: Entry[];
  locked: boolean;
}

export function ReferenceLapsPanel({ raceId, referenceLaps, entries, locked }: Props) {
  const [state, formAction, pending] = useActionState(updateReferenceLaps, null);

  // Default: max laps_to_sail among entrants, or 3
  const maxEntrantLaps =
    entries.length > 0
      ? Math.max(...entries.map((e) => e.laps_to_sail ?? 1))
      : null;
  const effective = referenceLaps ?? maxEntrantLaps ?? 3;

  // Entries that will be pro-rated (fewer laps than reference)
  const proRated = entries.filter(
    (e) => e.laps_to_sail !== null && e.laps_to_sail < effective
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference_laps">Reference laps</Label>
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="race_id" value={raceId} />
            <Input
              id="reference_laps"
              name="reference_laps"
              type="number"
              min="1"
              defaultValue={effective}
              disabled={locked}
              className="w-20"
              key={effective}
            />
            {!locked && (
              <Button type="submit" size="sm" disabled={pending} variant="outline">
                Save
              </Button>
            )}
          </form>
          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}
        </div>

        <div className="text-sm text-neutral-600 flex-1">
          <span className="font-medium text-neutral-900">{effective} laps</span>{" "}
          will be the reference.
          {proRated.length > 0 && (
            <span className="ml-1">
              {proRated.map((e, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <span className="font-medium">
                    {e.boats?.sail_number ?? e.helms?.display_name ?? "?"}
                  </span>{" "}
                  ({e.laps_to_sail} lap{e.laps_to_sail !== 1 ? "s" : ""}) will be
                  pro-rated to {effective}.
                </span>
              ))}
            </span>
          )}
          {entries.length === 0 && (
            <span className="text-neutral-400 ml-1">No entrants yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}
