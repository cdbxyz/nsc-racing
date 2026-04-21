export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { ManualAwardForm } from "./client";

export default async function ManualAwardPage() {
  const supabase = createServiceClient();

  const [{ data: trophies }, { data: helms }] = await Promise.all([
    supabase.from("trophies").select("id, name, accumulator_group").order("name"),
    supabase
      .from("helms")
      .select("id, display_name, full_name")
      .eq("archived", false)
      .order("full_name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/trophies"
          className="text-sm text-neutral-400 hover:text-neutral-700"
        >
          ← Trophies
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Award trophy manually</h1>
        <p className="text-sm text-neutral-500 mt-1">
          For end-of-season or special awards not tied to a specific race result.
        </p>
      </div>

      <ManualAwardForm
        trophies={trophies ?? []}
        helms={helms ?? []}
      />
    </div>
  );
}
