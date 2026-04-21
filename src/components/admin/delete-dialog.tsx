"use client";

import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  /** If true, show "Archive" as the primary action instead of hard delete */
  canArchive?: boolean;
  onDelete: () => Promise<{ error?: string }>;
  onArchive?: () => Promise<{ error?: string }>;
}

export function DeleteDialog({
  open,
  onOpenChange,
  label,
  canArchive,
  onDelete,
  onArchive,
}: DeleteDialogProps) {
  const [pending, startTransition] = useTransition();

  function handle(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        alert(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {label}?</DialogTitle>
          <DialogDescription>
            {canArchive
              ? "This record is referenced by existing data. You can archive it to hide it from active lists, or cancel."
              : "This will permanently delete the record. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          {canArchive && onArchive ? (
            <Button
              variant="secondary"
              onClick={() => handle(onArchive)}
              disabled={pending}
            >
              Archive
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => handle(onDelete)}
              disabled={pending}
            >
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
