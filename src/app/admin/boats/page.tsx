export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { BoatsClient } from "./client";

export default async function BoatsPage() {
  const supabase = createServiceClient();

  const [{ data: boats }, { data: classes }] = await Promise.all([
    supabase
      .from("boats")
      .select("*, boat_classes(name)")
      .order("sail_number"),
    supabase
      .from("boat_classes")
      .select("id, name")
      .eq("archived", false)
      .order("name"),
  ]);

  return <BoatsClient boats={boats ?? []} classes={classes ?? []} />;
}
