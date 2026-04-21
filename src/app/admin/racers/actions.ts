"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | null;

export async function upsertRacer(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const id = formData.get("id") as string | null;
  const full_name = (formData.get("full_name") as string).trim();
  const display_name = (formData.get("display_name") as string).trim();
  const personal_py_delta = Number(formData.get("personal_py_delta") ?? 0);
  const default_boat_id =
    (formData.get("default_boat_id") as string).trim() || null;
  const notes = (formData.get("notes") as string).trim() || null;

  if (!full_name || !display_name) {
    return { error: "Full name and display name are required." };
  }

  const payload = {
    full_name,
    display_name,
    personal_py_delta,
    default_boat_id,
    notes,
  };

  const { error } = id
    ? await supabase.from("racers").update(payload).eq("id", id)
    : await supabase.from("racers").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/admin/racers");
  return null;
}

export async function deleteRacer(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase.from("racers").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") return { error: "in_use" };
    return { error: error.message };
  }

  revalidatePath("/admin/racers");
  return null;
}

export async function archiveRacer(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("racers")
    .update({ archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/racers");
  return null;
}
