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
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { upsertClass, deleteClass, archiveClass } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type BoatClass = Database["public"]["Tables"]["boat_classes"]["Row"];

interface ClassesClientProps {
  classes: BoatClass[];
}

const EMPTY_STATE = null;

export function ClassesClient({ classes }: ClassesClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<BoatClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoatClass | null>(null);
  const [inUse, setInUse] = useState(false);

  const [state, formAction, pending] = useActionState(upsertClass, EMPTY_STATE);
  const [, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(cls: BoatClass) {
    setEditing(cls);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) setDialogOpen(false);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">
          Boat Classes
        </h1>
        <Button size="sm" onClick={openCreate}>
          Add class
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Base PY</th>
            <th className="pb-2 pr-4">Default laps</th>
            <th className="pb-2 pr-4">Notes</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr
              key={cls.id}
              className={`border-b border-neutral-100 ${cls.archived ? "opacity-40" : ""}`}
            >
              <td className="py-2 pr-4 font-medium text-neutral-900">
                {cls.name}
                {cls.archived && (
                  <span className="ml-2 text-xs text-neutral-400">
                    archived
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-neutral-600">{cls.base_py}</td>
              <td className="py-2 pr-4 text-neutral-600">{cls.default_laps}</td>
              <td className="py-2 pr-4 text-neutral-500">{cls.notes ?? "—"}</td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(cls)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setInUse(false);
                      setDeleteTarget(cls);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {classes.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-neutral-400">
                No classes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Upsert dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit class" : "Add class"}
            </DialogTitle>
          </DialogHeader>
          <form key={dialogKey} action={formAction} className="flex flex-col gap-4">
            {editing && (
              <input type="hidden" name="id" value={editing.id} />
            )}
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
              <Label htmlFor="base_py">Base PY</Label>
              <Input
                id="base_py"
                name="base_py"
                type="number"
                step="1"
                defaultValue={editing?.base_py ?? ""}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default_laps">Default laps</Label>
              <Input
                id="default_laps"
                name="default_laps"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.default_laps ?? ""}
                required
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

      {/* Delete / archive dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        label={deleteTarget?.name ?? ""}
        canArchive={inUse}
        onDelete={async () => {
          const result = await deleteClass(deleteTarget!.id);
          if (result?.error === "in_use") {
            setInUse(true);
            return { error: undefined };
          }
          return result ?? {};
        }}
        onArchive={async () => {
          const result = await archiveClass(deleteTarget!.id);
          return result ?? {};
        }}
      />
    </>
  );
}
