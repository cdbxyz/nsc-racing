import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

export async function computeRaceResults(raceId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: race } = await supabase
    .from("races")
    .select("reference_laps, use_base_py_only")
    .eq("id", raceId)
    .single();

  if (!race) return;

  const { data: entries } = await supabase
    .from("race_entries")
    .select(
      "id, laps_to_sail, finish_time_ms, base_py_snapshot, personal_py_delta_snapshot, class_id_snapshot, status"
    )
    .eq("race_id", raceId)
    .eq("status", "FIN");

  if (!entries || entries.length === 0) return;

  // Determine reference laps: explicit or max laps sailed
  const refLaps =
    race.reference_laps ??
    Math.max(...entries.map((e) => e.laps_to_sail ?? 1));

  type Scored = {
    id: string;
    classId: string | null;
    elapsedMs: number;
    normalisedMs: number;
    correctedMs: number;
  };

  const scored: Scored[] = entries
    .filter(
      (e) =>
        e.finish_time_ms != null &&
        e.laps_to_sail != null &&
        e.base_py_snapshot != null
    )
    .map((e) => {
      const laps = e.laps_to_sail!;
      const basePy = e.base_py_snapshot!;
      const elapsed = e.finish_time_ms!;
      const normalised = elapsed * (refLaps / laps);
      const effectivePy = race.use_base_py_only
        ? basePy
        : basePy + (e.personal_py_delta_snapshot ?? 0);
      const corrected = normalised * (1000 / effectivePy);

      return {
        id: e.id,
        classId: e.class_id_snapshot,
        elapsedMs: elapsed,
        normalisedMs: Math.round(normalised),
        correctedMs: Math.round(corrected),
      };
    });

  // Overall ranking
  scored.sort((a, b) => a.correctedMs - b.correctedMs);
  scored.forEach((e, i) => { (e as Scored & { positionOverall: number }).positionOverall = i + 1; });

  // Class ranking
  const byClass = new Map<string | null, Scored[]>();
  for (const e of scored) {
    const key = e.classId ?? null;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key)!.push(e);
  }

  const classPositions = new Map<string, number>();
  for (const group of byClass.values()) {
    group.forEach((e, i) => classPositions.set(e.id, i + 1));
  }

  // Write back
  for (const e of scored) {
    const pos = (e as Scored & { positionOverall?: number }).positionOverall;
    await supabase
      .from("race_entries")
      .update({
        elapsed_ms: e.elapsedMs,
        normalised_elapsed_ms: e.normalisedMs,
        corrected_ms: e.correctedMs,
        position_overall: pos,
        position_class: classPositions.get(e.id) ?? null,
      })
      .eq("id", e.id);
  }
}
