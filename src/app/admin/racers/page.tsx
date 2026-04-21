export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { RacersClient } from "./client";

export default async function RacersPage() {
  const supabase = createServiceClient();

  const [{ data: racers }, { data: boats }] = await Promise.all([
    supabase
      .from("racers")
      .select("*, boats(sail_number, name)")
      .order("full_name"),
    supabase
      .from("boats")
      .select("id, sail_number, name")
      .eq("archived", false)
      .order("sail_number"),
  ]);

  return <RacersClient racers={racers ?? []} boats={boats ?? []} />;
}
