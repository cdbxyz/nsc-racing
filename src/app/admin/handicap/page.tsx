export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { HandicapTable, type RacerRow, type HistoryRow } from "./client";

function raceDate(startDate: string, dayOffset: number): string {
  const d = new Date(startDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function HandicapPage() {
  const supabase = createServiceClient();

  // Most recent season
  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, start_date")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  // All non-archived racers with default boat info
  const { data: racersRaw } = await supabase
    .from("helms")
    .select(
      `id, full_name, display_name, personal_py_delta,
       boats:default_boat_id(sail_number, base_py, boat_classes(name))`
    )
    .eq("archived", false)
    .order("display_name");

  type RawBoat = {
    sail_number: string;
    base_py: number;
    boat_classes: { name: string } | null;
  } | null;
  type RawRacer = {
    id: string;
    full_name: string;
    display_name: string;
    personal_py_delta: number;
    boats: RawBoat;
  };

  const racers = (racersRaw ?? []) as RawRacer[];

  // Trophy awards for current season (to count per racer)
  const seasonRaceIds: string[] = [];
  if (season) {
    const { data: sRaces } = await supabase
      .from("races")
      .select("id")
      .eq("season_id", season.id);
    (sRaces ?? []).forEach((r) => seasonRaceIds.push(r.id));
  }

  const { data: awardsRaw } =
    seasonRaceIds.length > 0
      ? await supabase
          .from("trophy_awards")
          .select("helm_id, trophies(accumulator_group)")
          .in("race_id", seasonRaceIds)
      : { data: [] };

  type AwardRow = {
    helm_id: string;
    trophies: { accumulator_group: string | null } | null;
  };
  const awards = (awardsRaw ?? []) as AwardRow[];

  const trophyCountMap = new Map<string, number>();
  for (const a of awards.filter((a) => a.trophies?.accumulator_group == null)) {
    trophyCountMap.set(a.helm_id, (trophyCountMap.get(a.helm_id) ?? 0) + 1);
  }

  // Handicap history per racer
  const racerIds = racers.map((r) => r.id);
  const { data: historyRaw } =
    racerIds.length > 0
      ? await supabase
          .from("personal_handicap_history")
          .select(
            `id, helm_id, created_at, py_delta_before, py_delta_after, reason,
             trophy_awards(trophies(name)),
             races(name, day_offset, seasons(start_date))`
          )
          .in("helm_id", racerIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  type RawHistory = {
    id: string;
    helm_id: string;
    created_at: string;
    py_delta_before: number;
    py_delta_after: number;
    reason: string | null;
    trophy_awards: { trophies: { name: string } | null } | null;
    races: {
      name: string;
      day_offset: number;
      seasons: { start_date: string } | null;
    } | null;
  };

  const history = (historyRaw ?? []) as RawHistory[];

  const historyByRacer = new Map<string, HistoryRow[]>();
  for (const h of history) {
    const row: HistoryRow = {
      id: h.id,
      createdAt: h.created_at,
      pyBefore: h.py_delta_before,
      pyAfter: h.py_delta_after,
      reason: h.reason,
      trophyName: h.trophy_awards?.trophies?.name ?? null,
      raceName: h.races?.name ?? null,
      raceDate:
        h.races && h.races.seasons
          ? raceDate(h.races.seasons.start_date, h.races.day_offset)
          : null,
    };
    const list = historyByRacer.get(h.helm_id) ?? [];
    list.push(row);
    historyByRacer.set(h.helm_id, list);
  }

  const racerRows: RacerRow[] = racers.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    displayName: r.display_name,
    boatSailNumber: r.boats?.sail_number ?? null,
    className: r.boats?.boat_classes?.name ?? null,
    basePy: r.boats?.base_py ?? null,
    personalPyDelta: r.personal_py_delta,
    trophiesThisSeason: trophyCountMap.get(r.id) ?? 0,
    history: historyByRacer.get(r.id) ?? [],
  }));

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Handicap Admin
          </h1>
          {season && (
            <p className="text-sm text-neutral-500 mt-0.5">
              Current season: {season.year}
            </p>
          )}
        </div>
      </div>

      <HandicapTable racers={racerRows} seasonId={season?.id ?? null} />
    </div>
  );
}
