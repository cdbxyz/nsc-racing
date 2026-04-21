"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | null;

export async function upsertTrophy(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string).trim() || null;
  const eligibility_notes =
    (formData.get("eligibility_notes") as string).trim() || null;
  const accumulator_group =
    (formData.get("accumulator_group") as string).trim() || null;

  if (!name) return { error: "Name is required." };

  const payload = { name, description, eligibility_notes, accumulator_group };

  const { error } = id
    ? await supabase.from("trophies").update(payload).eq("id", id)
    : await supabase.from("trophies").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/admin/trophies");
  return null;
}

export async function deleteTrophy(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase.from("trophies").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") return { error: "in_use" };
    return { error: error.message };
  }

  revalidatePath("/admin/trophies");
  return null;
}
