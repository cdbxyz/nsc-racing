"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { serverActionError } from "@/lib/actions/errors";
import { revalidatePath } from "next/cache";

export async function awardTrophy(
  raceId: string,
  trophyId: string,
  racerId: string
): Promise<{ ok: true; awardId: string } | { error: string; errorId: string }> {
  try {
    await requireUnlocked();
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("apply_trophy_award", {
      p_race_id: raceId,
      p_trophy_id: trophyId,
      p_racer_id: racerId,
    });

    if (error) return serverActionError(error, "apply_trophy_award");

    revalidatePath(`/race/${raceId}/results`);
    return { ok: true, awardId: data as string };
  } catch (err) {
    return serverActionError(err, "awardTrophy");
  }
}

export async function undoAward(
  awardId: string,
  raceId: string
): Promise<{ ok: true } | { error: string; errorId: string }> {
  try {
    await requireUnlocked();
    const supabase = createServiceClient();

    const { error } = await supabase.rpc("undo_trophy_award", {
      p_award_id: awardId,
    });

    if (error) return serverActionError(error, "undo_trophy_award");

    revalidatePath(`/race/${raceId}/results`);
    return { ok: true };
  } catch (err) {
    return serverActionError(err, "undoAward");
  }
}
