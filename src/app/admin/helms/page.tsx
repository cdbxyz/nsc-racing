export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { RacersClient } from "./client";

export default async function RacersPage() {
  const supabase = createServiceClient();

  const [{ data: racers }, { data: boats }] = await Promise.all([
    supabase
      .from("helms")
      .select("*, boats(sail_number, owner)")
      .order("full_name"),
    supabase
      .from("boats")
      .select("id, sail_number, owner")
      .eq("archived", false)
      .order("sail_number"),
  ]);

  return <RacersClient racers={racers ?? []} boats={boats ?? []} />;
}
