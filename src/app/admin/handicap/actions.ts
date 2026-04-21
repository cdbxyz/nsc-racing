"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { serverActionError } from "@/lib/actions/errors";
import { revalidatePath } from "next/cache";

export async function resetSeasonDeltas(
  seasonId: string
): Promise<{ ok: true } | { error: string; errorId: string }> {
  try {
    await requireUnlocked();
    const supabase = createServiceClient();

    const { error } = await supabase.rpc("reset_season_deltas", {
      p_season_id: seasonId,
    });

    if (error) return serverActionError(error, "reset_season_deltas RPC");

    revalidatePath("/admin/handicap");
    return { ok: true };
  } catch (err) {
    return serverActionError(err, "resetSeasonDeltas");
  }
}
