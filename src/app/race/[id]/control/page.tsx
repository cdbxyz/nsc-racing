export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUnlocked } from "@/lib/auth/gate";
import { ControlClient } from "./client";
import type { InitialEntry } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RaceControlPage({ params }: PageProps) {
  await requireUnlocked();

  const { id: raceId } = await params;
  const supabase = createServiceClient();

  const { data: race } = await supabase
    .from("races")
    .select(
      `id, name, day_offset, start_time, status, started_at,
       countdown_started_at, countdown_abandoned_at,
       reference_laps, use_base_py_only, is_pursuit, notes,
       seasons(year, start_date),
       race_trophies(display_order, trophies(name)),
       race_entries(
         id, laps_to_sail, status, finish_time_ms,
         helms(display_name, full_name),
         boats(sail_number, boat_classes(name)),
         lap_times(lap_number, cumulative_elapsed_ms)
       )`
    )
    .eq("id", raceId)
    .single();

  if (!race) notFound();

  const season = race.seasons as { year: number; start_date: string } | null;

  function formatRaceDate() {
    if (!season?.start_date || !race) return "";
    const d = new Date(season.start_date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + race.day_offset);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  // Normalise entries for the client
  const rawEntries = (race.race_entries ?? []) as Array<{
    id: string;
    laps_to_sail: number | null;
    status: string;
    finish_time_ms: number | null;
    helms: { display_name: string; full_name: string } | null;
    boats: {
      sail_number: string;
      boat_classes: { name: string } | null;
    } | null;
    lap_times: { lap_number: number; cumulative_elapsed_ms: number }[];
  }>;

  const initialEntries: InitialEntry[] = rawEntries.map((e) => ({
    id: e.id,
    racerName: e.helms?.display_name ?? e.helms?.full_name ?? "?",
    sailNumber: e.boats?.sail_number ?? "?",
    className: e.boats?.boat_classes?.name ?? "?",
    lapsToSail: e.laps_to_sail ?? 3,
    serverLaps: [...(e.lap_times ?? [])]
      .sort((a, b) => a.lap_number - b.lap_number)
      .map((l) => ({ lapNumber: l.lap_number, cumulativeElapsedMs: l.cumulative_elapsed_ms })),
    status: e.status as InitialEntry["status"],
    finishTimeMs: e.finish_time_ms,
  }));

  const trophies = [...(race.race_trophies ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((rt) => (rt.trophies as { name: string } | null)?.name ?? "?");

  // Active countdown: countdown_started_at set, not abandoned, race still draft
  const activeCountdownStartedAt =
    race.status === "draft" &&
    race.countdown_started_at &&
    !race.countdown_abandoned_at
      ? race.countdown_started_at
      : null;

  return (
    <ControlClient
      raceId={raceId}
      raceName={race.name}
      raceDate={formatRaceDate()}
      raceTime={race.start_time.slice(0, 5)}
      trophies={trophies}
      useBasePyOnly={race.use_base_py_only}
      isPursuit={race.is_pursuit}
      referenceLaps={race.reference_laps}
      initialStatus={race.status}
      initialStartedAt={race.started_at}
      initialCountdownStartedAt={activeCountdownStartedAt}
      initialEntries={initialEntries}
      seasonYear={season?.year ?? null}
    />
  );
}
