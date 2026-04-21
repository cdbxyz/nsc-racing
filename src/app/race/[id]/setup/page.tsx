export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUnlocked } from "@/lib/auth/gate";
import { RacerPicker } from "./racer-picker";
import { EntryRow } from "./entry-row";
import { ReferenceLapsPanel } from "./reference-laps";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RaceSetupPage({ params }: PageProps) {
  await requireUnlocked();

  const { id: raceId } = await params;
  const supabase = createServiceClient();

  const [{ data: race }, { data: allRacers }, { data: allBoats }] =
    await Promise.all([
      supabase
        .from("races")
        .select(
          `*, seasons(year, start_date),
           race_trophies(display_order, trophies(name)),
           race_entries(
             id, race_id, laps_to_sail, status,
             base_py_snapshot, personal_py_delta_snapshot, effective_py_snapshot,
             helms(full_name, display_name),
             boats(sail_number, owner, boat_classes(name))
           )`
        )
        .eq("id", raceId)
        .single(),
      supabase
        .from("helms")
        .select(
          "id, full_name, display_name, personal_py_delta, default_boat_id, boats(sail_number, boat_classes(name))"
        )
        .eq("archived", false)
        .order("full_name"),
      supabase
        .from("boats")
        .select("id, sail_number, owner")
        .eq("archived", false)
        .order("sail_number"),
    ]);

  if (!race) notFound();

  const locked = race.status !== "draft";
  const season = race.seasons as { year: number; start_date: string } | null;

  // Sort trophies by display_order
  const trophies = [...(race.race_trophies ?? [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  // Sort entries by name
  const entries = [...(race.race_entries ?? [])].sort((a, b) =>
    (a.helms?.display_name ?? "").localeCompare(b.helms?.display_name ?? "")
  );

  const enteredHelmIds = new Set(
    entries.map((e) => (e as unknown as { helm_id: string }).helm_id)
  );

  // Compute race date from season start + day_offset
  function formatRaceDate() {
    if (!season?.start_date || !race) return "";
    const d = new Date(season.start_date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + race.day_offset);
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 flex flex-col gap-8">
      {/* Back link */}
      <div>
        <Link
          href={season ? `/admin/seasons/${season.year}` : "/admin/seasons"}
          className="text-sm text-neutral-400 hover:text-neutral-700"
        >
          ← {season ? `${season.year} Season` : "Seasons"}
        </Link>
      </div>

      {/* Race header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{race.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">{formatRaceDate()}</p>
          <p className="text-sm text-neutral-500">
            Start: {race.start_time.slice(0, 5)}
            {race.course_description && ` · ${race.course_description}`}
          </p>
          {trophies.length > 0 && (
            <p className="mt-1 text-sm text-neutral-400">
              Trophies:{" "}
              {trophies
                .map((rt) => (rt.trophies as { name: string } | null)?.name ?? "?")
                .join(", ")}
            </p>
          )}
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {race.use_base_py_only && (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                Base PY only
              </span>
            )}
            {race.is_pursuit && (
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
                Pursuit race
              </span>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            locked
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {race.status === "draft" ? "Draft" : race.status === "running" ? "Running" : "Finished"}
        </span>
      </div>

      {locked && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This race has started — entrant changes are locked.
        </div>
      )}

      {/* Reference laps */}
      <section>
        <h2 className="text-base font-semibold text-neutral-900 mb-3">
          Reference laps
        </h2>
        <ReferenceLapsPanel
          raceId={raceId}
          referenceLaps={race.reference_laps}
          entries={entries as Parameters<typeof ReferenceLapsPanel>[0]["entries"]}
          locked={locked}
        />
      </section>

      {/* Current entrants */}
      <section>
        <h2 className="text-base font-semibold text-neutral-900 mb-3">
          Entrants ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No entrants yet. Add helms below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-400">
                  <th className="pb-2 pr-3">Helm</th>
                  <th className="pb-2 pr-3">Boat</th>
                  <th className="pb-2 pr-3">Class</th>
                  <th className="pb-2 pr-3 text-center">Laps</th>
                  <th className="pb-2 pr-3 text-center">Base PY</th>
                  <th className="pb-2 pr-3 text-center">Eff. PY</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry as Parameters<typeof EntryRow>[0]["entry"]}
                    allBoats={allBoats ?? []}
                    locked={locked}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Racer picker */}
      {!locked && (
        <section>
          <h2 className="text-base font-semibold text-neutral-900 mb-3">
            Add entrants
          </h2>
          <RacerPicker
            raceId={raceId}
            racers={allRacers as Parameters<typeof RacerPicker>[0]["racers"] ?? []}
            enteredHelmIds={enteredHelmIds}
            locked={locked}
          />
        </section>
      )}
    </div>
  );
}
