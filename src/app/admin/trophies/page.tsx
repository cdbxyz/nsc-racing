export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { TrophiesClient } from "./client";

export default async function TrophiesPage() {
  const supabase = createServiceClient();
  const { data: trophies } = await supabase
    .from("trophies")
    .select("*")
    .order("name");

  return <TrophiesClient trophies={trophies ?? []} />;
}
