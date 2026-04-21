export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { SeasonsClient } from "./client";

export default async function SeasonsPage() {
  const supabase = createServiceClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*, races(count)")
    .order("year", { ascending: false });

  // Flatten the count from the nested relation
  const flat = (seasons ?? []).map((s) => ({
    ...s,
    race_count: (s.races as unknown as [{ count: number }])[0]?.count ?? 0,
  }));

  return <SeasonsClient seasons={flat} />;
}
