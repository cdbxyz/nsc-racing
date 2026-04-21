import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

export async function LiveRaceStrip() {
  const supabase = createServiceClient();

  // Check for running race first, then countdown race
  const { data: running } = await supabase
    .from("races")
    .select("id, name")
    .eq("status", "running")
    .limit(1)
    .maybeSingle();

  let race: { id: string; name: string; countdown: boolean } | null = null;

  if (running) {
    race = { ...running, countdown: false };
  } else {
    const { data: countdown } = await supabase
      .from("races")
      .select("id, name")
      .eq("status", "draft")
      .not("countdown_started_at", "is", null)
      .is("countdown_abandoned_at", null)
      .limit(1)
      .maybeSingle();
    if (countdown) race = { ...countdown, countdown: true };
  }

  if (!race) return null;

  return (
    <div className={`sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-2 text-sm ${
      race.countdown
        ? "bg-blue-600 text-white"
        : "bg-emerald-600 text-white"
    }`}>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-white/70 animate-pulse shrink-0" />
        <span className="font-medium truncate">
          {race.countdown ? "Countdown" : "Race in progress"} — {race.name}
        </span>
      </div>
      <Link
        href={`/race/${race.id}/control`}
        className="shrink-0 rounded bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-medium"
      >
        Control →
      </Link>
    </div>
  );
}
