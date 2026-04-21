"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | null;

export async function upsertBoat(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const id = formData.get("id") as string | null;
  const sail_number = (formData.get("sail_number") as string).trim();
  const class_id = (formData.get("class_id") as string).trim();
  const name = (formData.get("name") as string).trim() || null;
  const colour = (formData.get("colour") as string).trim() || null;
  const notes = (formData.get("notes") as string).trim() || null;

  if (!sail_number || !class_id) {
    return { error: "Sail number and class are required." };
  }

  const payload = { sail_number, class_id, name, colour, notes };

  const { error } = id
    ? await supabase.from("boats").update(payload).eq("id", id)
    : await supabase.from("boats").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/admin/boats");
  return null;
}

export async function deleteBoat(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase.from("boats").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") return { error: "in_use" };
    return { error: error.message };
  }

  revalidatePath("/admin/boats");
  return null;
}

export async function archiveBoat(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("boats")
    .update({ archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/boats");
  return null;
}
