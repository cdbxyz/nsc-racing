"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | null;

export async function createSeason(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const yearRaw = formData.get("year") as string;
  const year = parseInt(yearRaw, 10);
  if (!year || year < 2000 || year > 2100) {
    return { error: "Enter a valid year (2000–2100)." };
  }

  const { error } = await supabase.rpc("create_season_from_template", {
    p_year: year,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `A season for ${year} already exists.` };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/seasons");
  redirect(`/admin/seasons/${year}`);
}

export async function updateRace(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const id = formData.get("id") as string;
  const start_time = formData.get("start_time") as string;
  const reference_laps_raw = formData.get("reference_laps") as string;
  const reference_laps =
    reference_laps_raw.trim() !== "" ? parseInt(reference_laps_raw, 10) : null;
  const course_description =
    (formData.get("course_description") as string).trim() || null;
  const use_base_py_only = formData.get("use_base_py_only") === "on";
  const notes = (formData.get("notes") as string).trim() || null;

  const { error } = await supabase
    .from("races")
    .update({ start_time, reference_laps, course_description, use_base_py_only, notes })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/seasons");
  return null;
}

export async function addTrophyToRace(
  raceId: string,
  trophyId: string,
  displayOrder: number
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("race_trophies")
    .insert({ race_id: raceId, trophy_id: trophyId, display_order: displayOrder });

  if (error) {
    if (error.code === "23505") return { error: "Trophy already attached to this race." };
    return { error: error.message };
  }

  revalidatePath("/admin/seasons");
  return null;
}

export async function removeTrophyFromRace(
  raceId: string,
  trophyId: string
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("race_trophies")
    .delete()
    .eq("race_id", raceId)
    .eq("trophy_id", trophyId);

  if (error) return { error: error.message };

  revalidatePath("/admin/seasons");
  return null;
}

export async function reorderTrophy(
  raceId: string,
  trophyId: string,
  displayOrder: number
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("race_trophies")
    .update({ display_order: displayOrder })
    .eq("race_id", raceId)
    .eq("trophy_id", trophyId);

  if (error) return { error: error.message };

  revalidatePath("/admin/seasons");
  return null;
}
