export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

function raceDate(startDate: string, dayOffset: number): Date {
  const d = new Date(startDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function TrophiesPage() {
  const supabase = createServiceClient();

  // All trophies
  const { data: trophies } = await supabase
    .from("trophies")
    .select("id, name, description, accumulator_group")
    .order("name");

  if (!trophies || trophies.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Trophy Cabinet
        </h1>
        <p className="text-neutral-500">
          No trophies in the registry yet.{" "}
          <Link href="/admin/trophies" className="underline hover:text-neutral-700">
            Add trophies in admin.
          </Link>
        </p>
      </main>
    );
  }

  // All seasons ordered by year desc
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, year, start_date")
    .order("year", { ascending: false });

  // All trophy awards with race + season data
  const { data: awardsRaw } = await supabase
    .from("trophy_awards")
    .select(
      `id, trophy_id, helm_id, awarded_at,
       helms(display_name, full_name),
       races(day_offset, season_id, seasons(year, start_date))`
    )
    .order("awarded_at", { ascending: false });

  type RawAward = {
    id: string;
    trophy_id: string;
    helm_id: string;
    awarded_at: string;
    helms: { display_name: string; full_name: string } | null;
    races: {
      day_offset: number;
      season_id: string;
      seasons: { year: number; start_date: string } | null;
    } | null;
  };

  const awards = (awardsRaw ?? []) as RawAward[];

  // Build per-trophy award list
  const awardsByTrophy = new Map<string, RawAward[]>();
  for (const a of awards) {
    const list = awardsByTrophy.get(a.trophy_id) ?? [];
    list.push(a);
    awardsByTrophy.set(a.trophy_id, list);
  }

  const currentSeasonYear = seasons?.[0]?.year ?? null;
  const lastSeasonYear = seasons?.[1]?.year ?? null;

  // Group trophies alphabetically
  const grouped = new Map<string, typeof trophies>();
  for (const t of trophies) {
    const letter = t.name[0].toUpperCase();
    const bucket = grouped.get(letter) ?? [];
    bucket.push(t);
    grouped.set(letter, bucket);
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* ── Hero ── */}
      <div className="bg-navy-50 border-b border-navy-100">
        <div className="mx-auto max-w-3xl px-4 pt-8 pb-7">
          <Link href="/" className="text-sm text-navy-700/60 hover:text-navy-800">
            ← Home
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-navy-900">
            Trophy Cabinet
          </h1>
          <p className="text-navy-700/70 text-sm mt-1">
            {trophies.length} trophies in the registry
          </p>
        </div>
      </div>

      <div className="bg-neutral-50 flex-1">
      <div className="mx-auto max-w-3xl px-4 py-10">

      {[...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([letter, group]) => (
        <section key={letter} className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3 pb-1 border-b border-neutral-100">
            {letter}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {group.map((trophy) => {
              const trophyAwards = awardsByTrophy.get(trophy.id) ?? [];

              function winnerForYear(year: number | null) {
                if (!year) return null;
                return trophyAwards.find(
                  (a) => a.races?.seasons?.year === year
                );
              }

              const currentWinner = winnerForYear(currentSeasonYear);
              const lastWinner = winnerForYear(lastSeasonYear);
              const allWinners = trophyAwards;

              return (
                <div
                  key={trophy.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {trophy.name}
                        {trophy.accumulator_group && (
                          <span className="ml-2 text-xs font-normal text-neutral-400">
                            accumulator
                          </span>
                        )}
                      </h3>
                      {trophy.description && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {trophy.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-neutral-400 mb-0.5">
                        {currentSeasonYear ?? "Current"} season
                      </p>
                      {currentWinner ? (
                        <p className="font-medium text-neutral-900">
                          {currentWinner.helms?.display_name ??
                            currentWinner.helms?.full_name ?? "?"}
                        </p>
                      ) : (
                        <p className="text-neutral-400">Not yet awarded</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 mb-0.5">
                        {lastSeasonYear ?? "Last"} season
                      </p>
                      {lastWinner ? (
                        <p className="font-medium text-neutral-900">
                          {lastWinner.helms?.display_name ??
                            lastWinner.helms?.full_name ?? "?"}
                        </p>
                      ) : (
                        <p className="text-neutral-400">—</p>
                      )}
                    </div>
                  </div>

                  {allWinners.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-700 select-none">
                        All-time winners ({allWinners.length})
                      </summary>
                      <ol className="mt-2 flex flex-col gap-1 text-sm">
                        {allWinners.map((a) => {
                          const season = a.races?.seasons;
                          const date = season
                            ? formatDate(
                                raceDate(season.start_date, a.races!.day_offset)
                              )
                            : "?";
                          return (
                            <li
                              key={a.id}
                              className="flex items-baseline gap-2 text-neutral-600"
                            >
                              <span className="text-neutral-400 tabular-nums">
                                {season?.year ?? "?"}
                              </span>
                              <span className="font-medium text-neutral-900">
                                {a.helms?.display_name ??
                                  a.helms?.full_name ?? "?"}
                              </span>
                              <span className="ml-auto text-neutral-400 text-xs">
                                {date}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      </div>
      </div>
    </main>
  );
}
