"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/actions/toast";
import { awardTrophyManually } from "./actions";

interface Trophy {
  id: string;
  name: string;
  accumulator_group: string | null;
}

interface Helm {
  id: string;
  display_name: string;
  full_name: string;
}

export function ManualAwardForm({
  trophies,
  helms,
}: {
  trophies: Trophy[];
  helms: Helm[];
}) {
  const router = useRouter();
  const [trophyId, setTrophyId] = useState("");
  const [helmId, setHelmId] = useState("");
  const [applyDeduction, setApplyDeduction] = useState(true);
  const [isPending, startTransition] = useTransition();

  const selectedTrophy = trophies.find((t) => t.id === trophyId);
  const isAccumulator = selectedTrophy?.accumulator_group != null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trophyId || !helmId) return;

    startTransition(async () => {
      const result = await awardTrophyManually(trophyId, helmId, applyDeduction && !isAccumulator);
      if ("error" in result) {
        toastError(result.error, result.errorId);
      } else {
        toast.success("Trophy awarded.");
        router.push("/admin/trophies");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700" htmlFor="trophy">
          Trophy
        </label>
        <select
          id="trophy"
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          value={trophyId}
          onChange={(e) => setTrophyId(e.target.value)}
          required
        >
          <option value="">Select trophy…</option>
          {trophies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}{t.accumulator_group ? " (accumulator)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700" htmlFor="helm">
          Helm
        </label>
        <select
          id="helm"
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          value={helmId}
          onChange={(e) => setHelmId(e.target.value)}
          required
        >
          <option value="">Select helm…</option>
          {helms.map((h) => (
            <option key={h.id} value={h.id}>
              {h.display_name !== h.full_name
                ? `${h.display_name} (${h.full_name})`
                : h.display_name}
            </option>
          ))}
        </select>
      </div>

      {!isAccumulator && (
        <div className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3">
          <input
            type="checkbox"
            id="deduction"
            checked={applyDeduction}
            onChange={(e) => setApplyDeduction(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-neutral-900"
          />
          <div>
            <label htmlFor="deduction" className="text-sm font-medium text-neutral-700 cursor-pointer">
              Apply PY deduction
            </label>
            <p className="text-xs text-neutral-500 mt-0.5">
              3% for first win this season, 1% for subsequent. Uncheck for honorary awards.
            </p>
          </div>
        </div>
      )}

      {isAccumulator && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
          Accumulator trophy — no PY deduction applied.
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !trophyId || !helmId}>
          {isPending ? "Awarding…" : "Award trophy"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
