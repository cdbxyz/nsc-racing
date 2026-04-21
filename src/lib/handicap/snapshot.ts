import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface EntrySnapshot {
  boat_id: string;
  class_id_snapshot: string;
  base_py_snapshot: number;
  personal_py_delta_snapshot: number;
  /** effective_py depends on the race's use_base_py_only flag, supplied by caller */
  effectivePy(useBasePyOnly: boolean): number;
  laps_to_sail: number;
}

export async function computeEntrySnapshot(
  racerId: string,
  boatOverrideId?: string | null
): Promise<EntrySnapshot> {
  const supabase = createServiceClient();

  // 1. Load racer
  const { data: racer, error: racerErr } = await supabase
    .from("helms")
    .select("default_boat_id, personal_py_delta")
    .eq("id", racerId)
    .single();

  if (racerErr || !racer) throw new Error("Helm not found.");

  const boatId = boatOverrideId ?? racer.default_boat_id;
  if (!boatId) throw new Error("Helm has no default boat. Select a boat to continue.");

  // 2. Load boat + class
  const { data: boat, error: boatErr } = await supabase
    .from("boats")
    .select("id, class_id, boat_classes(id, base_py, default_laps)")
    .eq("id", boatId)
    .single();

  if (boatErr || !boat) throw new Error("Boat not found.");

  const cls = boat.boat_classes as {
    id: string;
    base_py: number;
    default_laps: number;
  } | null;
  if (!cls) throw new Error("Boat has no class assigned.");

  const personal_py_delta = racer.personal_py_delta ?? 0;

  return {
    boat_id: boat.id,
    class_id_snapshot: cls.id,
    base_py_snapshot: cls.base_py,
    personal_py_delta_snapshot: personal_py_delta,
    effectivePy(useBasePyOnly: boolean) {
      return useBasePyOnly
        ? cls.base_py
        : cls.base_py + personal_py_delta;
    },
    laps_to_sail: cls.default_laps,
  };
}
