"use client";

import { useActionState, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEntry, removeEntry } from "./actions";

interface Boat {
  id: string;
  sail_number: string;
  name: string | null;
}

interface EntryRowProps {
  entry: {
    id: string;
    race_id: string;
    laps_to_sail: number | null;
    base_py_snapshot: number | null;
    personal_py_delta_snapshot: number | null;
    effective_py_snapshot: number | null;
    racers: { full_name: string; display_name: string } | null;
    boats: { sail_number: string; name: string | null; boat_classes: { name: string } | null } | null;
  };
  allBoats: Boat[];
  locked: boolean;
}

export function EntryRow({ entry, allBoats, locked }: EntryRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [removePending, startRemove] = useTransition();
  const [state, formAction, savePending] = useActionState(updateEntry, null);

  function handleRemove() {
    startRemove(async () => {
      await removeEntry(entry.id, entry.race_id);
    });
  }

  return (
    <>
      <tr className="border-b border-neutral-100">
        <td className="py-2 pr-3 font-medium text-neutral-900">
          {entry.racers?.display_name ?? "?"}
        </td>
        <td className="py-2 pr-3 text-neutral-600">
          {entry.boats?.sail_number ?? "—"}
          {entry.boats?.name ? ` (${entry.boats.name})` : ""}
        </td>
        <td className="py-2 pr-3 text-neutral-500 text-sm">
          {entry.boats?.boat_classes?.name ?? "—"}
        </td>
        <td className="py-2 pr-3 text-center text-neutral-700">
          {entry.laps_to_sail ?? "—"}
        </td>
        <td className="py-2 pr-3 text-center text-neutral-500 text-sm">
          {entry.base_py_snapshot ?? "—"}
          {entry.personal_py_delta_snapshot !== null && entry.personal_py_delta_snapshot !== 0 && (
            <span className="text-xs text-neutral-400 ml-1">
              ({entry.personal_py_delta_snapshot > 0 ? "+" : ""}{entry.personal_py_delta_snapshot})
            </span>
          )}
        </td>
        <td className="py-2 pr-3 text-center font-medium text-neutral-900">
          {entry.effective_py_snapshot ?? "—"}
        </td>
        <td className="py-2 text-right">
          {!locked && (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={handleRemove}
                disabled={removePending}
              >
                Remove
              </Button>
            </div>
          )}
        </td>
      </tr>

      <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit entry — {entry.racers?.display_name}
            </DialogTitle>
          </DialogHeader>
          <form key={entry.id} action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="entry_id" value={entry.id} />
            <input type="hidden" name="race_id" value={entry.race_id} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`boat-${entry.id}`}>Boat</Label>
              <select
                id={`boat-${entry.id}`}
                name="boat_id"
                defaultValue={entry.boats?.sail_number ? allBoats.find(b => b.sail_number === entry.boats!.sail_number)?.id ?? "" : ""}
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {allBoats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.sail_number}{b.name ? ` – ${b.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`laps-${entry.id}`}>Laps to sail</Label>
              <Input
                id={`laps-${entry.id}`}
                name="laps_to_sail"
                type="number"
                min="1"
                defaultValue={entry.laps_to_sail ?? ""}
                required
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savePending}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
