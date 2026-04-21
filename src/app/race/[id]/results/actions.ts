"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function awardTrophy(
  raceId: string,
  trophyId: string,
  racerId: string
): Promise<{ ok: true; awardId: string } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("apply_trophy_award", {
    p_race_id: raceId,
    p_trophy_id: trophyId,
    p_racer_id: racerId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/race/${raceId}/results`);
  return { ok: true, awardId: data as string };
}

export async function undoAward(
  awardId: string,
  raceId: string
): Promise<{ ok: true } | { error: string }> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase.rpc("undo_trophy_award", {
    p_award_id: awardId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/race/${raceId}/results`);
  return { ok: true };
}
