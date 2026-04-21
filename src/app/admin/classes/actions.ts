"use server";

import { requireUnlocked } from "@/lib/auth/gate";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type ActionState = { error?: string } | null;

export async function upsertClass(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string).trim();
  const base_py = Number(formData.get("base_py"));
  const default_laps = Number(formData.get("default_laps"));
  const notes = (formData.get("notes") as string).trim() || null;

  if (!name || isNaN(base_py) || isNaN(default_laps)) {
    return { error: "Name, base PY, and default laps are required." };
  }

  const payload = { name, base_py, default_laps, notes };

  const { error } = id
    ? await supabase.from("boat_classes").update(payload).eq("id", id)
    : await supabase.from("boat_classes").insert(payload);

  if (error) return { error: error.message };

  revalidatePath("/admin/classes");
  return null;
}

export async function deleteClass(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase.from("boat_classes").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "in_use" };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/classes");
  return null;
}

export async function archiveClass(id: string): Promise<ActionState> {
  await requireUnlocked();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("boat_classes")
    .update({ archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/classes");
  return null;
}
