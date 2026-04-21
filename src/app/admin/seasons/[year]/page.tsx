export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { deriveSeasonDates, raceDate } from "@/lib/season/dates";
import { RaceRow } from "./race-row";

interface PageProps {
  params: Promise<{ year: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  locked: "Locked",
};

export default async function SeasonPage({ params }: PageProps) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year)) notFound();

  const supabase = createServiceClient();

  const [{ data: season }, { data: allTrophies }] = await Promise.all([
    supabase
      .from("seasons")
      .select(
        `*, races(*, race_trophies(trophy_id, display_order, trophies(name)))`
      )
      .eq("year", year)
      .single(),
    supabase.from("trophies").select("id, name").order("name"),
  ]);

  if (!season) notFound();

  const locked = season.status === "locked";
  const { start } = deriveSeasonDates(year);

  // Sort races by day_offset, then start_time (handles 10a/10b)
  const races = [...(season.races ?? [])].sort((a, b) => {
    if (a.day_offset !== b.day_offset) return a.day_offset - b.day_offset;
    return a.start_time.localeCompare(b.start_time);
  });

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/admin/seasons"
          className="text-sm text-neutral-400 hover:text-neutral-700"
        >
          ← Seasons
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {year} Season
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {season.start_date} – {season.end_date}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            locked
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {STATUS_LABEL[season.status] ?? season.status}
        </span>
      </div>

      {locked && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Season locked — first race has started. Draft races can still be rescheduled; started and finished races are read-only.
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
            <th className="pb-2 pr-3">Race</th>
            <th className="pb-2 pr-3">Date</th>
            <th className="pb-2 pr-3">Start</th>
            <th className="pb-2 pr-3">Trophies</th>
            <th className="pb-2 pr-3">Flags</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {races.map((race) => (
            <RaceRow
              key={race.id}
              race={race}
              raceDate={formatDate(raceDate(start, race.day_offset))}
              trophies={race.race_trophies ?? []}
              allTrophies={allTrophies ?? []}
              locked={race.status !== "draft"}
              seasonLocked={locked}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
