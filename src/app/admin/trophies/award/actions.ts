"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireUnlocked } from "@/lib/auth/gate";
import { serverActionError } from "@/lib/actions/errors";

export async function awardTrophyManually(
  trophyId: string,
  helmId: string,
  applyDeduction: boolean
): Promise<{ awardId: string } | { error: string; errorId: string }> {
  try {
    await requireUnlocked();
    const supabase = createServiceClient();

    if (applyDeduction) {
      const { data, error } = await supabase.rpc("apply_trophy_award", {
        p_race_id: null as unknown as string,
        p_trophy_id: trophyId,
        p_helm_id: helmId,
      });
      if (error) throw error;
      return { awardId: data as string };
    } else {
      // Insert award only, no PY deduction
      const { data, error } = await supabase
        .from("trophy_awards")
        .insert({ trophy_id: trophyId, helm_id: helmId, race_id: null })
        .select("id")
        .single();
      if (error) throw error;
      return { awardId: data.id };
    }
  } catch (err) {
    return serverActionError(err, "awardTrophyManually");
  }
}
