"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RaceTrophyEditor } from "./race-trophy-editor";
import { updateRace } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type Race = Database["public"]["Tables"]["races"]["Row"];
type RaceTrophy = {
  trophy_id: string;
  display_order: number;
  trophies: { name: string } | null;
};
type Trophy = { id: string; name: string };

interface Props {
  race: Race;
  raceDate: string;
  trophies: RaceTrophy[];
  allTrophies: Trophy[];
  locked: boolean;
}

export function RaceRow({ race, raceDate, trophies, allTrophies, locked }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateRace, null);

  const trophyNames = [...trophies]
    .sort((a, b) => a.display_order - b.display_order)
    .map((t) => t.trophies?.name ?? "?")
    .join(", ");

  return (
    <>
      <tr className="border-b border-neutral-100 align-top">
        <td className="py-2 pr-3 font-medium text-neutral-900 whitespace-nowrap">
          {race.name}
        </td>
        <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap">
          {raceDate}
        </td>
        <td className="py-2 pr-3 text-neutral-600 whitespace-nowrap">
          {race.start_time.slice(0, 5)}
        </td>
        <td className="py-2 pr-3 text-neutral-500 text-xs max-w-xs truncate">
          {trophyNames || "—"}
        </td>
        <td className="py-2 pr-3 text-neutral-500 text-xs">
          <span className="flex gap-1 flex-wrap">
            {race.use_base_py_only && (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-500">
                Base PY
              </span>
            )}
            {race.is_pursuit && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
                Pursuit
              </span>
            )}
          </span>
        </td>
        <td className="py-2 text-right">
          <div className="flex justify-end gap-1">
            <Link href={`/race/${race.id}/setup`}>
              <Button size="sm" variant="outline">
                Set up
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
              {locked ? "View" : "Edit"}
            </Button>
          </div>
        </td>
      </tr>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {race.name}{" "}
              <span className="font-normal text-neutral-500">— {raceDate}</span>
            </DialogTitle>
          </DialogHeader>

          {locked && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              Season locked — first race has started. Fields are read-only.
            </div>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={race.id} />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`time-${race.id}`}>Start time</Label>
                <Input
                  id={`time-${race.id}`}
                  name="start_time"
                  type="time"
                  defaultValue={race.start_time.slice(0, 5)}
                  disabled={locked}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`laps-${race.id}`}>Reference laps</Label>
                <Input
                  id={`laps-${race.id}`}
                  name="reference_laps"
                  type="number"
                  min="1"
                  defaultValue={race.reference_laps ?? ""}
                  placeholder="3"
                  disabled={locked}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`desc-${race.id}`}>Course description</Label>
              <Input
                id={`desc-${race.id}`}
                name="course_description"
                defaultValue={race.course_description ?? ""}
                disabled={locked}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`notes-${race.id}`}>Notes</Label>
              <Input
                id={`notes-${race.id}`}
                name="notes"
                defaultValue={race.notes ?? ""}
                disabled={locked}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id={`py-${race.id}`}
                name="use_base_py_only"
                type="checkbox"
                defaultChecked={race.use_base_py_only}
                disabled={locked}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <Label htmlFor={`py-${race.id}`}>Base PY only</Label>
            </div>

            {!locked && (
              <>
                {state?.error && (
                  <p className="text-sm text-red-600">{state.error}</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </form>

          <div className="border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Trophies
            </p>
            <RaceTrophyEditor
              raceId={race.id}
              attached={trophies}
              all={allTrophies}
              locked={locked}
            />
          </div>

          {locked && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
