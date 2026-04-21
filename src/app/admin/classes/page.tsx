export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { ClassesClient } from "./client";

export default async function ClassesPage() {
  const supabase = createServiceClient();
  const { data: classes } = await supabase
    .from("boat_classes")
    .select("*")
    .order("name");

  return <ClassesClient classes={classes ?? []} />;
}
