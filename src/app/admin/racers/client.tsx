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
import { upsertRacer, deleteRacer, archiveRacer } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Racer = Database["public"]["Tables"]["racers"]["Row"];
type Boat = Pick<
  Database["public"]["Tables"]["boats"]["Row"],
  "id" | "sail_number" | "name"
>;

interface RacersClientProps {
  racers: (Racer & { boats: { sail_number: string; name: string | null } | null })[];
  boats: Boat[];
}

export function RacersClient({ racers, boats }: RacersClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<Racer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Racer | null>(null);
  const [inUse, setInUse] = useState(false);

  const [state, formAction, pending] = useActionState(upsertRacer, null);

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(r: Racer) {
    setEditing(r);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Racers</h1>
        <Button size="sm" onClick={openCreate}>
          Add racer
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Display name</th>
            <th className="pb-2 pr-4">Default boat</th>
            <th className="pb-2 pr-4">PY delta</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {racers.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-neutral-100 ${r.archived ? "opacity-40" : ""}`}
            >
              <td className="py-2 pr-4 font-medium text-neutral-900">
                {r.full_name}
                {r.archived && (
                  <span className="ml-2 text-xs text-neutral-400">
                    archived
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-neutral-600">{r.display_name}</td>
              <td className="py-2 pr-4 text-neutral-500">
                {r.boats
                  ? `${r.boats.sail_number}${r.boats.name ? ` (${r.boats.name})` : ""}`
                  : "—"}
              </td>
              <td className="py-2 pr-4 text-neutral-500">
                {r.personal_py_delta !== 0
                  ? (r.personal_py_delta > 0 ? "+" : "") + r.personal_py_delta
                  : "—"}
              </td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setInUse(false);
                      setDeleteTarget(r);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {racers.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-neutral-400">
                No racers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit racer" : "Add racer"}
            </DialogTitle>
          </DialogHeader>
          <form key={dialogKey} action={formAction} className="flex flex-col gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={editing?.full_name ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={editing?.display_name ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default_boat_id">Default boat</Label>
              <select
                id="default_boat_id"
                name="default_boat_id"
                defaultValue={editing?.default_boat_id ?? ""}
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">None</option>
                {boats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.sail_number}
                    {b.name ? ` – ${b.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="personal_py_delta">Personal PY delta</Label>
              <Input
                id="personal_py_delta"
                name="personal_py_delta"
                type="number"
                step="1"
                defaultValue={editing?.personal_py_delta ?? 0}
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
        label={deleteTarget?.full_name ?? ""}
        canArchive={inUse}
        onDelete={async () => {
          const result = await deleteRacer(deleteTarget!.id);
          if (result?.error === "in_use") {
            setInUse(true);
            return { error: undefined };
          }
          return result ?? {};
        }}
        onArchive={async () => {
          const result = await archiveRacer(deleteTarget!.id);
          return result ?? {};
        }}
      />
    </>
  );
}
