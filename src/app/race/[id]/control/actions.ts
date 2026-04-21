"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { computeRaceResults } from "@/lib/results/compute";
import { revalidatePath } from "next/cache";

export type ActionResult = { error: string } | { ok: true; startedAt?: string };

/** Stamp the race start time and transition status to 'running'. */
export async function startRace(
  raceId: string
): Promise<{ ok: true; startedAt: string } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("races")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", raceId)
    .eq("status", "draft") // idempotency guard
    .select("started_at")
    .single();

  if (error) return { error: error.message };
  if (!data?.started_at) return { error: "Race already started." };

  revalidatePath(`/race/${raceId}/control`);
  return { ok: true, startedAt: data.started_at };
}

/**
 * Record a lap for an entry.
 * If this is the final lap (lapNumber === lapsToSail), marks the entry FIN.
 */
export async function recordLap(
  entryId: string,
  raceId: string,
  lapNumber: number,
  cumulativeElapsedMs: number,
  lapsToSail: number
): Promise<{ ok: true } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error: lapError } = await supabase.from("lap_times").insert({
    race_entry_id: entryId,
    lap_number: lapNumber,
    cumulative_elapsed_ms: cumulativeElapsedMs,
  });

  if (lapError) {
    // 23505 = unique violation → duplicate lap (double-tap that bypassed debounce)
    if (lapError.code === "23505") return { ok: true }; // treat as no-op
    return { error: lapError.message };
  }

  if (lapNumber >= lapsToSail) {
    await supabase
      .from("race_entries")
      .update({
        status: "FIN",
        finish_time_ms: cumulativeElapsedMs,
        elapsed_ms: cumulativeElapsedMs,
      })
      .eq("id", entryId);
  }

  return { ok: true };
}

/** Mark an entry with a non-racing status (DNF, RET, DSQ, OCS, DNS, DNC). */
export async function setEntryStatus(
  entryId: string,
  raceId: string,
  status: "DNF" | "RET" | "DSQ" | "OCS" | "DNS" | "DNC"
): Promise<{ ok: true } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("race_entries")
    .update({ status })
    .eq("id", entryId);

  if (error) return { error: error.message };
  return { ok: true };
}

/** Remove the most recent lap for an entry; revert entry to 'racing' if it was FIN. */
export async function undoLastLap(
  entryId: string,
  raceId: string
): Promise<{ ok: true; lapRemoved: number } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  // Find max lap_number for this entry
  const { data: laps, error: fetchErr } = await supabase
    .from("lap_times")
    .select("lap_number")
    .eq("race_entry_id", entryId)
    .order("lap_number", { ascending: false })
    .limit(1);

  if (fetchErr) return { error: fetchErr.message };
  if (!laps || laps.length === 0) return { error: "No laps to undo." };

  const lapToRemove = laps[0].lap_number;

  const { error: delErr } = await supabase
    .from("lap_times")
    .delete()
    .eq("race_entry_id", entryId)
    .eq("lap_number", lapToRemove);

  if (delErr) return { error: delErr.message };

  // Revert FIN status back to racing
  await supabase
    .from("race_entries")
    .update({ status: "racing", finish_time_ms: null, elapsed_ms: null })
    .eq("id", entryId)
    .eq("status", "FIN");

  revalidatePath(`/race/${raceId}/control`);
  return { ok: true, lapRemoved: lapToRemove };
}

/** Close the race and trigger result computation. */
export async function finishRace(
  raceId: string
): Promise<{ ok: true } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("races")
    .update({ status: "finished" })
    .eq("id", raceId)
    .eq("status", "running");

  if (error) return { error: error.message };

  await computeRaceResults(raceId);

  revalidatePath(`/race/${raceId}/control`);
  return { ok: true };
}
