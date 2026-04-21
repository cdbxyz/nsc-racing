"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { computeEntrySnapshot } from "@/lib/handicap/snapshot";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | null;

/** Add a racer to a race, optionally with a boat override. */
export async function addEntry(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const race_id = formData.get("race_id") as string;
  const helm_id = formData.get("helm_id") as string;
  const boat_override = (formData.get("boat_override") as string) || null;

  // Check race is still in draft
  const { data: race, error: raceErr } = await supabase
    .from("races")
    .select("status, use_base_py_only")
    .eq("id", race_id)
    .single();

  if (raceErr || !race) return { error: "Race not found." };
  if (race.status !== "draft") {
    return { error: "Entrants cannot be changed once a race has started." };
  }

  // Compute snapshot (throws on missing boat/class)
  let snapshot;
  try {
    snapshot = await computeEntrySnapshot(helm_id, boat_override);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const effective_py = snapshot.effectivePy(race.use_base_py_only);

  const { error } = await supabase.from("race_entries").insert({
    race_id,
    helm_id,
    boat_id: snapshot.boat_id,
    class_id_snapshot: snapshot.class_id_snapshot,
    base_py_snapshot: snapshot.base_py_snapshot,
    personal_py_delta_snapshot: snapshot.personal_py_delta_snapshot,
    effective_py_snapshot: effective_py,
    laps_to_sail: snapshot.laps_to_sail,
    status: "racing",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "This helm is already entered in this race." };
    }
    return { error: error.message };
  }

  revalidatePath(`/race/${race_id}/setup`);
  return null;
}

/** Remove an entry (only while race is draft). */
export async function removeEntry(entryId: string, raceId: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { data: race } = await supabase
    .from("races")
    .select("status")
    .eq("id", raceId)
    .single();

  if (race?.status !== "draft") {
    return { error: "Entrants cannot be changed once a race has started." };
  }

  const { error } = await supabase.from("race_entries").delete().eq("id", entryId);
  if (error) return { error: error.message };

  revalidatePath(`/race/${raceId}/setup`);
  return null;
}

/** Update laps_to_sail or boat_id for an existing entry. */
export async function updateEntry(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const entry_id = formData.get("entry_id") as string;
  const race_id = formData.get("race_id") as string;
  const laps_to_sail = parseInt(formData.get("laps_to_sail") as string, 10);
  const boat_id = formData.get("boat_id") as string;

  const { data: race } = await supabase
    .from("races")
    .select("status, use_base_py_only")
    .eq("id", race_id)
    .single();

  if (race?.status !== "draft") {
    return { error: "Entrants cannot be changed once a race has started." };
  }

  if (!laps_to_sail || laps_to_sail < 1) {
    return { error: "Laps must be at least 1." };
  }

  // Re-snapshot if boat changed
  const { data: currentEntry } = await supabase
    .from("race_entries")
    .select("boat_id, helm_id")
    .eq("id", entry_id)
    .single();

  if (!currentEntry) return { error: "Entry not found." };

  if (boat_id && boat_id !== currentEntry.boat_id) {
    let snapshot;
    try {
      snapshot = await computeEntrySnapshot(currentEntry.helm_id, boat_id);
    } catch (e) {
      return { error: (e as Error).message };
    }
    const { error } = await supabase
      .from("race_entries")
      .update({
        laps_to_sail,
        boat_id: snapshot.boat_id,
        class_id_snapshot: snapshot.class_id_snapshot,
        base_py_snapshot: snapshot.base_py_snapshot,
        personal_py_delta_snapshot: snapshot.personal_py_delta_snapshot,
        effective_py_snapshot: snapshot.effectivePy(race!.use_base_py_only),
      })
      .eq("id", entry_id);
    if (error) return { error: error.message };
    revalidatePath(`/race/${race_id}/setup`);
    return null;
  }

  const { error } = await supabase
    .from("race_entries")
    .update({ laps_to_sail })
    .eq("id", entry_id);

  if (error) return { error: error.message };

  revalidatePath(`/race/${race_id}/setup`);
  return null;
}

/** Update the reference_laps on the race itself. */
export async function updateReferenceLaps(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const race_id = formData.get("race_id") as string;
  const reference_laps = parseInt(formData.get("reference_laps") as string, 10);

  if (!reference_laps || reference_laps < 1) {
    return { error: "Reference laps must be at least 1." };
  }

  const { error } = await supabase
    .from("races")
    .update({ reference_laps })
    .eq("id", race_id);

  if (error) return { error: error.message };

  revalidatePath(`/race/${race_id}/setup`);
  return null;
}
