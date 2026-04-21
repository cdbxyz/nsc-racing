export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { isUnlocked } from "@/lib/auth/gate";
import { Button } from "@/components/ui/button";

function raceDate(startDate: string, dayOffset: number): Date {
  const d = new Date(startDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function msToTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default async function Home() {
  const supabase = createServiceClient();
  const officer = await isUnlocked();
  const todayUtc = new Date().toISOString().slice(0, 10);

  // ── Current season ────────────────────────────────────────────────────────
  const { data: season } = await supabase
    .from("seasons")
    .select("id, year, start_date, end_date, status")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Races for current season ──────────────────────────────────────────────
  type RawRace = {
    id: string;
    name: string;
    day_offset: number;
    start_time: string;
    status: string;
    race_trophies: { trophies: { name: string } | null }[];
    race_entries: {
      id: string;
      position_overall: number | null;
      corrected_ms: number | null;
      status: string;
      racers: { display_name: string; full_name: string } | null;
      boats: { sail_number: string; boat_classes: { name: string } | null } | null;
    }[];
  };

  const { data: rawRaces } = season
    ? await supabase
        .from("races")
        .select(
          `id, name, day_offset, start_time, status,
           race_trophies(trophies(name)),
           race_entries(id, position_overall, corrected_ms, status,
             racers(display_name, full_name),
             boats(sail_number, boat_classes(name))
           )`
        )
        .eq("season_id", season.id)
        .order("day_offset")
    : { data: null };

  const races = (rawRaces ?? []) as RawRace[];

  // ── Next race ─────────────────────────────────────────────────────────────
  const racesWithDates = races.map((r) => ({
    ...r,
    date: raceDate(season!.start_date, r.day_offset),
  }));

  const today = new Date(todayUtc + "T00:00:00Z");
  const nextRace = racesWithDates.find(
    (r) => r.status !== "finished" && r.date >= today
  ) ?? racesWithDates.find((r) => r.status !== "finished");

  // ── Latest finished race ──────────────────────────────────────────────────
  const finishedRaces = racesWithDates
    .filter((r) => r.status === "finished")
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const latestRace = finishedRaces[0] ?? null;
  const podium = latestRace
    ? [...latestRace.race_entries]
        .filter((e) => e.status === "FIN" && e.position_overall != null)
        .sort((a, b) => (a.position_overall ?? 99) - (b.position_overall ?? 99))
        .slice(0, 3)
    : [];

  // ── Trophy tally this season ──────────────────────────────────────────────
  const seasonRaceIds = races.map((r) => r.id);

  type AwardRow = {
    racer_id: string;
    racers: { display_name: string; full_name: string } | null;
    trophies: { accumulator_group: string | null } | null;
  };

  const { data: awardsRaw } =
    seasonRaceIds.length > 0
      ? await supabase
          .from("trophy_awards")
          .select("racer_id, racers(display_name, full_name), trophies(accumulator_group)")
          .in("race_id", seasonRaceIds)
      : { data: [] };

  const awards = (awardsRaw ?? []) as AwardRow[];
  // Only count non-accumulator trophies toward the tally
  const nonAccAwards = awards.filter((a) => a.trophies?.accumulator_group == null);

  const tallyMap = new Map<string, { name: string; count: number }>();
  for (const a of nonAccAwards) {
    const name =
      a.racers?.display_name ?? a.racers?.full_name ?? a.racer_id;
    const existing = tallyMap.get(a.racer_id);
    if (existing) existing.count++;
    else tallyMap.set(a.racer_id, { name, count: 1 });
  }
  const tally = [...tallyMap.values()].sort((a, b) => b.count - a.count);

  // ── Racer count for empty-state detection ─────────────────────────────────
  const { count: racerCount } = await supabase
    .from("racers")
    .select("id", { count: "exact", head: true })
    .eq("archived", false);

  return (
    <main className="min-h-screen flex flex-col">
      <section className="mx-auto max-w-4xl w-full px-4 pt-10 pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
          Nefyn Sailing Club
        </h1>
        <p className="mt-1 text-neutral-500">
          {season
            ? `${season.year} Fortnight · ${formatDate(new Date(season.start_date + "T00:00:00Z"))} – ${formatDate(new Date(season.end_date + "T00:00:00Z"))}`
            : "15-day fortnight race programme"}
        </p>
      </section>

      <section className="mx-auto max-w-4xl w-full px-4 pb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ── Next Race ── */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Next Race
          </p>

          {!season ? (
            <>
              <p className="text-neutral-500 text-sm">No season created yet.</p>
              {officer && (
                <Link href="/admin/seasons">
                  <Button size="sm" variant="outline" className="mt-auto">
                    Create season
                  </Button>
                </Link>
              )}
            </>
          ) : !nextRace ? (
            <p className="text-neutral-500 text-sm">
              All {races.length} races finished.
            </p>
          ) : (
            <>
              <div>
                <p className="text-xl font-semibold text-neutral-900">
                  {nextRace.name}
                </p>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {formatDate(nextRace.date)} · {nextRace.start_time.slice(0, 5)}
                </p>
                {nextRace.race_trophies.length > 0 && (
                  <p className="text-xs text-neutral-400 mt-1">
                    {nextRace.race_trophies
                      .map((t) => t.trophies?.name ?? "?")
                      .join(", ")}
                  </p>
                )}
              </div>
              {officer && (
                <div className="mt-auto flex gap-2">
                  {nextRace.status === "running" ? (
                    <Link href={`/race/${nextRace.id}/control`}>
                      <Button size="sm">Open race control</Button>
                    </Link>
                  ) : (
                    <Link href={`/race/${nextRace.id}/setup`}>
                      <Button size="sm" variant="outline">
                        Set up
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Latest Results ── */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Latest Results
          </p>

          {!latestRace ? (
            <>
              <p className="text-neutral-500 text-sm">
                {(racerCount ?? 0) === 0
                  ? "No racers set up yet."
                  : "No races finished yet."}
              </p>
              {(racerCount ?? 0) === 0 && officer && (
                <Link href="/admin/racers">
                  <Button size="sm" variant="outline" className="mt-auto">
                    Add racers
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold text-neutral-900">{latestRace.name}</p>
                <p className="text-xs text-neutral-400 mb-3">
                  {formatDate(latestRace.date)}
                </p>
                <ol className="flex flex-col gap-1.5">
                  {podium.map((e, i) => (
                    <li key={e.id} className="flex items-baseline gap-2 text-sm">
                      <span className="text-neutral-400 w-4 shrink-0 text-right">
                        {i + 1}.
                      </span>
                      <span className="font-medium text-neutral-900 truncate">
                        {e.racers?.display_name ?? e.racers?.full_name ?? "?"}
                      </span>
                      <span className="text-neutral-400 tabular-nums ml-auto shrink-0">
                        {e.corrected_ms != null ? msToTime(e.corrected_ms) : "—"}
                      </span>
                    </li>
                  ))}
                  {podium.length === 0 && (
                    <li className="text-sm text-neutral-400">
                      Results not yet computed.
                    </li>
                  )}
                </ol>
              </div>
              <Link
                href={`/race/${latestRace.id}/results`}
                className="mt-auto text-sm font-medium text-neutral-900 hover:underline"
              >
                Full results →
              </Link>
            </>
          )}
        </div>

        {/* ── Trophy Tally ── */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Trophy Tally · {season?.year ?? "—"}
          </p>

          {tally.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              No trophies awarded yet this season.
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {tally.map((r, i) => (
                <li key={r.name} className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-400 w-4 shrink-0 text-right">
                    {i + 1}.
                  </span>
                  <span className="font-medium text-neutral-900 truncate">
                    {r.name}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 tabular-nums">
                    {r.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <Link
            href="/trophies"
            className="mt-auto text-sm font-medium text-neutral-900 hover:underline"
          >
            Trophy cabinet →
          </Link>
        </div>
      </section>

      {/* ── Upcoming schedule ── */}
      {season && racesWithDates.length > 0 && (
        <section className="mx-auto max-w-4xl w-full px-4 pb-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">
            Race Schedule · {season.year}
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {racesWithDates.map((r) => {
                  const isPast = r.status === "finished";
                  const isRunning = r.status === "running";
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-neutral-50 last:border-0"
                    >
                      <td className="py-2.5 px-4 w-28 text-neutral-400 whitespace-nowrap tabular-nums">
                        {formatDate(r.date)}
                      </td>
                      <td className="py-2.5 px-2 text-neutral-400 whitespace-nowrap">
                        {r.start_time.slice(0, 5)}
                      </td>
                      <td
                        className={`py-2.5 px-2 font-medium ${isPast ? "text-neutral-400" : "text-neutral-900"}`}
                      >
                        {r.name}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isRunning && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            Live
                          </span>
                        )}
                        {isPast && (
                          <Link
                            href={`/race/${r.id}/results`}
                            className="text-xs text-neutral-400 hover:text-neutral-700"
                          >
                            Results
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
