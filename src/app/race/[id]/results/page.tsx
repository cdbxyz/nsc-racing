export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { isUnlocked } from "@/lib/auth/gate";
import {
  CopyLinkButton,
  TrophySection,
  type RaceTrophy,
  type FinishedEntry,
  type ExistingAward,
} from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

function msToTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const NON_RACING_STATUSES = ["DNF", "DNS", "DSQ", "RET", "OCS", "DNC"] as const;

export default async function ResultsPage({ params }: PageProps) {
  const { id: raceId } = await params;
  const supabase = createServiceClient();

  const { data: race } = await supabase
    .from("races")
    .select(
      `id, name, day_offset, start_time, status,
       seasons(year, start_date),
       race_trophies(display_order, trophy_id, trophies(name, accumulator_group)),
       race_entries(
         id, helm_id, status, corrected_ms, normalised_elapsed_ms,
         elapsed_ms, position_overall, position_class,
         base_py_snapshot, effective_py_snapshot, laps_to_sail,
         helms(display_name, full_name),
         boats(sail_number, boat_classes(name))
       ),
       trophy_awards(id, trophy_id, helm_id, helms(display_name, full_name))`
    )
    .eq("id", raceId)
    .single();

  if (!race) notFound();

  const season = race.seasons as { year: number; start_date: string } | null;

  function formatRaceDate() {
    if (!season?.start_date) return "";
    const d = new Date(season.start_date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + race!.day_offset);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  type RawEntry = {
    id: string;
    helm_id: string;
    status: string;
    corrected_ms: number | null;
    normalised_elapsed_ms: number | null;
    elapsed_ms: number | null;
    position_overall: number | null;
    position_class: number | null;
    base_py_snapshot: number | null;
    effective_py_snapshot: number | null;
    laps_to_sail: number | null;
    helms: { display_name: string; full_name: string } | null;
    boats: { sail_number: string; boat_classes: { name: string } | null } | null;
  };

  const rawEntries = (race.race_entries ?? []) as RawEntry[];

  const finishedEntries = rawEntries
    .filter((e) => e.status === "FIN" && e.position_overall != null)
    .sort((a, b) => (a.position_overall ?? 0) - (b.position_overall ?? 0));

  const nonFinishers = rawEntries.filter((e) =>
    (NON_RACING_STATUSES as readonly string[]).includes(e.status)
  );

  const winner = finishedEntries[0];
  const winnerCorrected = winner?.corrected_ms ?? null;

  // Trophies — exclude accumulator trophies from the award flow
  type RawRaceTrophy = {
    display_order: number;
    trophy_id: string;
    trophies: { name: string; accumulator_group: string | null } | null;
  };
  const raceTrophies: RaceTrophy[] = ([...(race.race_trophies ?? [])] as RawRaceTrophy[])
    .filter((rt) => rt.trophies?.accumulator_group == null)
    .sort((a, b) => a.display_order - b.display_order)
    .map((rt) => ({ trophyId: rt.trophy_id, name: rt.trophies?.name ?? "?" }));

  type RawAward = {
    id: string;
    trophy_id: string;
    helm_id: string;
    helms: { display_name: string; full_name: string } | null;
  };
  const initialAwards: ExistingAward[] = (race.trophy_awards as RawAward[]).map(
    (a) => ({
      awardId: a.id,
      trophyId: a.trophy_id,
      racerId: a.helm_id,
      racerName: a.helms?.display_name ?? a.helms?.full_name ?? "?",
    })
  );

  const finishedForClient: FinishedEntry[] = finishedEntries.map((e) => ({
    entryId: e.id,
    racerId: e.helm_id,
    racerName: e.helms?.display_name ?? e.helms?.full_name ?? "?",
    positionOverall: e.position_overall!,
  }));

  const officerMode = await isUnlocked();

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      {/* Print-only header shown when printing */}
      <div className="print-header px-8 pt-6 pb-4 border-b border-neutral-300 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Nefyn Sailing Club</p>
            <p className="text-sm text-neutral-600">nsc-racing.vercel.app</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{race.name}</p>
            <p className="text-sm text-neutral-600">
              {formatRaceDate()} · {race.start_time.slice(0, 5)}
              {season && ` · ${season.year}`}
            </p>
          </div>
        </div>
      </div>

      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between no-print">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Home
        </Link>
        <CopyLinkButton />
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Race header */}
        <div className="mb-6 no-print">
          <h1 className="text-2xl font-bold text-neutral-900">{race.name}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {formatRaceDate()} · {race.start_time.slice(0, 5)}
            {season && ` · ${season.year} Season`}
          </p>
          {race.status !== "finished" && (
            <span className="mt-2 inline-block rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
              Race in progress — provisional results
            </span>
          )}
        </div>

        {/* Results table */}
        {finishedEntries.length === 0 ? (
          <p className="text-neutral-500 text-sm">No finishers recorded yet.</p>
        ) : (
          <>
          {/* ── Mobile card stack (< sm) ── */}
          <div className="sm:hidden flex flex-col gap-2 mb-6">
            {finishedEntries.map((e) => {
              const gap =
                winnerCorrected != null && e.corrected_ms != null
                  ? e.corrected_ms - winnerCorrected
                  : null;
              const name = e.helms?.display_name ?? e.helms?.full_name ?? "?";
              const sail = e.boats?.sail_number ?? "?";
              const cls = e.boats?.boat_classes?.name ?? "?";
              return (
                <details key={e.id} className="rounded-lg border border-neutral-200 bg-white">
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                    <span className="text-lg font-bold text-neutral-400 w-8 shrink-0 tabular-nums">
                      {e.position_overall}
                    </span>
                    <span className="flex-1 font-semibold text-neutral-900 truncate">{name}</span>
                    <span className="font-mono tabular-nums text-neutral-700 shrink-0 text-sm">
                      {e.corrected_ms != null ? msToTime(e.corrected_ms) : "—"}
                    </span>
                  </summary>
                  <div className="px-4 pb-3 pt-1 border-t border-neutral-100 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-neutral-400">Sail</span>
                    <span className="text-neutral-700">{sail}</span>
                    <span className="text-neutral-400">Class</span>
                    <span className="text-neutral-700">{cls}</span>
                    <span className="text-neutral-400">Elapsed</span>
                    <span className="font-mono tabular-nums text-neutral-700">
                      {e.elapsed_ms != null ? msToTime(e.elapsed_ms) : "—"}
                    </span>
                    <span className="text-neutral-400">Normalised</span>
                    <span className="font-mono tabular-nums text-neutral-700">
                      {e.normalised_elapsed_ms != null ? msToTime(e.normalised_elapsed_ms) : "—"}
                    </span>
                    <span className="text-neutral-400">Class pos</span>
                    <span className="text-neutral-700">{e.position_class ?? "—"}</span>
                    {gap != null && gap > 0 && (
                      <>
                        <span className="text-neutral-400">Gap to 1st</span>
                        <span className="font-mono tabular-nums text-neutral-500">+{msToTime(gap)}</span>
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </div>

          {/* ── Desktop table (≥ sm) ── */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-xs text-neutral-400 uppercase tracking-wider">
                  <th className="py-2 px-3 text-left font-medium">Pos</th>
                  <th className="py-2 px-3 text-left font-medium">Helm</th>
                  <th className="py-2 px-3 text-left font-medium hidden sm:table-cell">Sail</th>
                  <th className="py-2 px-3 text-left font-medium hidden sm:table-cell">Class</th>
                  <th className="py-2 px-3 text-right font-medium hidden md:table-cell">Elapsed</th>
                  <th className="py-2 px-3 text-right font-medium">Corrected</th>
                  <th className="py-2 px-3 text-right font-medium hidden md:table-cell">Gap</th>
                </tr>
              </thead>
              <tbody>
                {finishedEntries.map((e) => {
                  const gap =
                    winnerCorrected != null && e.corrected_ms != null
                      ? e.corrected_ms - winnerCorrected
                      : null;
                  const name = e.helms?.display_name ?? e.helms?.full_name ?? "?";
                  const sail = e.boats?.sail_number ?? "?";
                  const cls = e.boats?.boat_classes?.name ?? "?";

                  return (
                    <tr key={e.id} className="border-b border-neutral-50 last:border-0">
                      <td className="py-2.5 px-3 font-bold text-neutral-700 w-10">
                        {e.position_overall}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-900 font-medium">
                        {name}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 hidden sm:table-cell">
                        {sail}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 hidden sm:table-cell">
                        {cls}
                      </td>
                      <td className="py-2.5 px-3 text-right text-neutral-500 hidden md:table-cell font-mono tabular-nums">
                        {e.elapsed_ms != null ? msToTime(e.elapsed_ms) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-800 tabular-nums">
                        {e.corrected_ms != null ? msToTime(e.corrected_ms) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right text-neutral-400 hidden md:table-cell font-mono tabular-nums">
                        {gap != null && gap > 0 ? `+${msToTime(gap)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Non-finishers */}
        {nonFinishers.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Non-finishers
            </h2>
            <div className="flex flex-wrap gap-2">
              {nonFinishers.map((e) => {
                const name = e.helms?.display_name ?? e.helms?.full_name ?? "?";
                return (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
                  >
                    {name}
                    <span className="font-medium text-neutral-400">{e.status}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Trophy section — officer only */}
        {officerMode && (
          <TrophySection
            raceId={raceId}
            trophies={raceTrophies}
            finishedEntries={finishedForClient}
            initialAwards={initialAwards}
          />
        )}
      </div>
    </main>
  );
}
