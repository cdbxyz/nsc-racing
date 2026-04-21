"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSeason } from "./actions";
import type { Database } from "@/lib/supabase/database.types";

type Season = Database["public"]["Tables"]["seasons"]["Row"] & {
  race_count: number;
};

interface SeasonsClientProps {
  seasons: Season[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  locked: "Locked",
};

export function SeasonsClient({ seasons }: SeasonsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createSeason, null);

  // Auto-close dialog on successful create (state null means no error, but
  // createSeason redirects on success so this is belt-and-braces).
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Seasons</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          New season
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
            <th className="pb-2 pr-4">Year</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Start</th>
            <th className="pb-2 pr-4">End</th>
            <th className="pb-2 pr-4">Races</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {seasons.map((s) => (
            <tr key={s.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-medium text-neutral-900">
                {s.year}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "locked"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-neutral-600">{s.start_date}</td>
              <td className="py-2 pr-4 text-neutral-600">{s.end_date}</td>
              <td className="py-2 pr-4 text-neutral-600">{s.race_count}</td>
              <td className="py-2 text-right">
                <Link
                  href={`/admin/seasons/${s.year}`}
                  className="text-sm font-medium text-neutral-900 hover:underline"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
          {seasons.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-neutral-400">
                No seasons yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New season from template</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                name="year"
                type="number"
                min="2000"
                max="2100"
                defaultValue={new Date().getFullYear() + 1}
                required
              />
              <p className="text-xs text-neutral-500">
                Dates are derived automatically from the August bank holiday.
              </p>
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
                Create season
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
