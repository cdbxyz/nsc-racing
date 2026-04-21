"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { upsertBoat, deleteBoat, archiveBoat } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Boat = Database["public"]["Tables"]["boats"]["Row"];
type BoatClass = Pick<
  Database["public"]["Tables"]["boat_classes"]["Row"],
  "id" | "name"
>;

interface BoatsClientProps {
  boats: (Boat & { boat_classes: { name: string } | null })[];
  classes: BoatClass[];
}

export function BoatsClient({ boats, classes }: BoatsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<Boat | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Boat | null>(null);
  const [inUse, setInUse] = useState(false);

  const [state, formAction, pending] = useActionState(upsertBoat, null);

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(b: Boat) {
    setEditing(b);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Boats</h1>
        <Button size="sm" onClick={openCreate}>
          Add boat
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
            <th className="pb-2 pr-4">Sail no.</th>
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Class</th>
            <th className="pb-2 pr-4">Colour</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {boats.map((b) => (
            <tr
              key={b.id}
              className={`border-b border-neutral-100 ${b.archived ? "opacity-40" : ""}`}
            >
              <td className="py-2 pr-4 font-medium text-neutral-900">
                {b.sail_number}
                {b.archived && (
                  <span className="ml-2 text-xs text-neutral-400">
                    archived
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-neutral-600">{b.name ?? "—"}</td>
              <td className="py-2 pr-4 text-neutral-600">
                {b.boat_classes?.name ?? "—"}
              </td>
              <td className="py-2 pr-4 text-neutral-500">{b.colour ?? "—"}</td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setInUse(false);
                      setDeleteTarget(b);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {boats.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-neutral-400">
                No boats yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit boat" : "Add boat"}</DialogTitle>
          </DialogHeader>
          <form key={dialogKey} action={formAction} className="flex flex-col gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sail_number">Sail number</Label>
              <Input
                id="sail_number"
                name="sail_number"
                defaultValue={editing?.sail_number ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="class_id">Class</Label>
              <select
                id="class_id"
                name="class_id"
                defaultValue={editing?.class_id ?? ""}
                required
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">Select a class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="colour">Colour (optional)</Label>
              <Input
                id="colour"
                name="colour"
                defaultValue={editing?.colour ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                defaultValue={editing?.notes ?? ""}
              />
            </div>
            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {editing ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        label={deleteTarget ? `${deleteTarget.sail_number}` : ""}
        canArchive={inUse}
        onDelete={async () => {
          const result = await deleteBoat(deleteTarget!.id);
          if (result?.error === "in_use") {
            setInUse(true);
            return { error: undefined };
          }
          return result ?? {};
        }}
        onArchive={async () => {
          const result = await archiveBoat(deleteTarget!.id);
          return result ?? {};
        }}
      />
    </>
  );
}
