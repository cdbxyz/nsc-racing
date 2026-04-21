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
import { upsertTrophy, deleteTrophy } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Trophy = Database["public"]["Tables"]["trophies"]["Row"];

interface TrophiesClientProps {
  trophies: Trophy[];
}

export function TrophiesClient({ trophies }: TrophiesClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<Trophy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trophy | null>(null);

  const [state, formAction, pending] = useActionState(upsertTrophy, null);

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(t: Trophy) {
    setEditing(t);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Trophies</h1>
        <Button size="sm" onClick={openCreate}>
          Add trophy
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Accumulator group</th>
            <th className="pb-2 pr-4">Description</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {trophies.map((t) => (
            <tr key={t.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-medium text-neutral-900">
                {t.name}
              </td>
              <td className="py-2 pr-4 text-neutral-500">
                {t.accumulator_group ?? "—"}
              </td>
              <td className="py-2 pr-4 text-neutral-500 max-w-xs truncate">
                {t.description ?? "—"}
              </td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setDeleteTarget(t)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {trophies.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-neutral-400">
                No trophies yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit trophy" : "Add trophy"}</DialogTitle>
          </DialogHeader>
          <form key={dialogKey} action={formAction} className="flex flex-col gap-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accumulator_group">Accumulator group</Label>
              <Input
                id="accumulator_group"
                name="accumulator_group"
                defaultValue={editing?.accumulator_group ?? ""}
                placeholder="e.g. overall"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eligibility_notes">Eligibility notes</Label>
              <Input
                id="eligibility_notes"
                name="eligibility_notes"
                defaultValue={editing?.eligibility_notes ?? ""}
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
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        label={deleteTarget?.name ?? ""}
        onDelete={async () => {
          const result = await deleteTrophy(deleteTarget!.id);
          if (result?.error === "in_use") {
            return { error: "This trophy has been awarded and cannot be deleted." };
          }
          return result ?? {};
        }}
      />
    </>
  );
}
