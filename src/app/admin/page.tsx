export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { deriveSeasonDates, raceDate } from "@/lib/season/dates";

// ─── Helpers ────────────────────────────────────────────────────────────────

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function progressPercent(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
      {children}
    </h2>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold text-neutral-900 tabular-nums">{value}</span>
      <span className="text-xs text-neutral-500">{label}</span>
      {sub && <span className="text-xs text-neutral-400">{sub}</span>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const supabase = createServiceClient();
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [
    { data: activeSeason },
    { data: liveRace },
    { data: countdownRace },
    { count: helmCount },
    { count: boatCount },
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("*, races(id, name, day_offset, start_time, status, countdown_started_at, countdown_abandoned_at)")
      .in("status", ["draft", "locked"])
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("races")
      .select("id, name, start_time, status, seasons(year, start_date)")
      .eq("status", "running")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("races")
      .select("id, name, countdown_started_at, seasons(year, start_date)")
      .eq("status", "draft")
      .not("countdown_started_at", "is", null)
      .is("countdown_abandoned_at", null)
      .limit(1)
      .maybeSingle(),
    supabase.from("helms").select("*", { count: "exact", head: true }).eq("archived", false),
    supabase.from("boats").select("*", { count: "exact", head: true }).eq("archived", false),
  ]);

  // ── Season-dependent data ──
  type RaceRow = {
    id: string;
    name: string;
    day_offset: number;
    start_time: string;
    status: string;
    countdown_started_at: string | null;
    countdown_abandoned_at: string | null;
  };

  const races: RaceRow[] = (activeSeason?.races ?? []) as RaceRow[];

  const seasonStart = activeSeason
    ? new Date(activeSeason.start_date + "T00:00:00Z")
    : null;
  const seasonEnd = activeSeason
    ? new Date(activeSeason.end_date + "T00:00:00Z")
    : null;

  // Compute offset for today relative to season start
  const todayOffset = seasonStart ? diffDays(todayUTC, seasonStart) : null;

  // Sort races by day_offset then start_time
  const sortedRaces = [...races].sort((a, b) =>
    a.day_offset !== b.day_offset
      ? a.day_offset - b.day_offset
      : a.start_time.localeCompare(b.start_time)
  );

  // Today's races
  const todaysRaces =
    todayOffset != null
      ? sortedRaces.filter((r) => r.day_offset === todayOffset)
      : [];

  // Upcoming races (future, draft or running)
  const upcomingRaces =
    todayOffset != null
      ? sortedRaces
          .filter((r) => r.day_offset > todayOffset && r.status !== "finished")
          .slice(0, 4)
      : [];

  // Recent finished races
  const recentFinished = sortedRaces
    .filter((r) => r.status === "finished")
    .slice(-3)
    .reverse();

  // Season stats
  const totalRaces = races.length;
  const finishedRaces = races.filter((r) => r.status === "finished").length;
  const draftRaces = races.filter((r) => r.status === "draft").length;

  // Progress
  const progress =
    seasonStart && seasonEnd ? progressPercent(seasonStart, seasonEnd, todayUTC) : null;

  // ── Data integrity warnings ──
  const { data: helmsWithoutBoat } = await supabase
    .from("helms")
    .select("id, full_name, display_name")
    .eq("archived", false)
    .is("default_boat_id", null);

  // Trophy count for active season
  const { count: trophyAwardCount } = await supabase
    .from("trophy_awards")
    .select("*", { count: "exact", head: true });

  // ── Today's action state machine ──
  type ActionState =
    | { type: "race_running"; raceId: string; raceName: string }
    | { type: "countdown"; raceId: string; raceName: string }
    | { type: "race_today_draft"; races: RaceRow[] }
    | { type: "race_today_finished"; races: RaceRow[] }
    | { type: "upcoming"; nextRace: RaceRow; daysUntil: number }
    | { type: "all_finished" }
    | { type: "no_races" }
    | { type: "no_season" };

  function getActionState(): ActionState {
    if (!activeSeason) return { type: "no_season" };
    if (liveRace) return { type: "race_running", raceId: liveRace.id, raceName: liveRace.name };
    if (countdownRace) return { type: "countdown", raceId: countdownRace.id, raceName: countdownRace.name };

    if (todaysRaces.length > 0) {
      const allFinished = todaysRaces.every((r) => r.status === "finished");
      if (allFinished) return { type: "race_today_finished", races: todaysRaces };
      return { type: "race_today_draft", races: todaysRaces };
    }

    if (upcomingRaces.length > 0 && todayOffset != null) {
      const next = upcomingRaces[0];
      return { type: "upcoming", nextRace: next, daysUntil: next.day_offset - todayOffset };
    }

    if (totalRaces === 0) return { type: "no_races" };

    if (finishedRaces === totalRaces) return { type: "all_finished" };

    // All remaining are draft but in the past
    return { type: "no_races" };
  }

  const actionState = getActionState();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>
        {activeSeason && (
          <p className="text-sm text-neutral-500 mt-0.5">{activeSeason.year} Season</p>
        )}
      </div>

      {/* ── Live race banner ── */}
      {(actionState.type === "race_running" || actionState.type === "countdown") && (
        <div className={`rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${
          actionState.type === "race_running"
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-blue-50 border border-blue-200"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full animate-pulse ${
              actionState.type === "race_running" ? "bg-emerald-500" : "bg-blue-500"
            }`} />
            <span className={`text-sm font-medium ${
              actionState.type === "race_running" ? "text-emerald-800" : "text-blue-800"
            }`}>
              {actionState.type === "race_running"
                ? `Race in progress — ${actionState.raceName}`
                : `Countdown running — ${actionState.raceName}`}
            </span>
          </div>
          <Link
            href={`/race/${actionState.raceId}/control`}
            className={`text-xs font-medium px-3 py-1.5 rounded-md ${
              actionState.type === "race_running"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Go to control →
          </Link>
        </div>
      )}

      {/* ── Season header ── */}
      {activeSeason && seasonStart && seasonEnd && (
        <Card>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">{activeSeason.year} Season</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {fmtDate(seasonStart)} – {fmtDate(seasonEnd)}
              </p>
            </div>
            <Link
              href={`/admin/seasons/${activeSeason.year}`}
              className="text-xs text-neutral-400 hover:text-neutral-700 shrink-0"
            >
              Manage →
            </Link>
          </div>
          {progress != null && (
            <div>
              <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-neutral-800 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1.5">
                {finishedRaces} of {totalRaces} races finished · {draftRaces} remaining
              </p>
            </div>
          )}
        </Card>
      )}

      {!activeSeason && (
        <Card className="border-dashed">
          <p className="text-sm text-neutral-500 mb-3">No active season.</p>
          <Link
            href="/admin/seasons"
            className="inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
          >
            Manage seasons →
          </Link>
        </Card>
      )}

      {/* ── Today's action ── */}
      <div>
        <SectionTitle>Today&rsquo;s action</SectionTitle>
        {actionState.type === "no_season" && (
          <Card className="border-dashed text-sm text-neutral-400">
            No active season — nothing to do today.
          </Card>
        )}
        {actionState.type === "no_races" && (
          <Card className="border-dashed text-sm text-neutral-400">
            No races scheduled.{" "}
            {activeSeason && (
              <Link href={`/admin/seasons/${activeSeason.year}`} className="text-neutral-600 underline underline-offset-2">
                Add races to the programme →
              </Link>
            )}
          </Card>
        )}
        {actionState.type === "all_finished" && (
          <Card className="bg-green-50 border-green-200">
            <p className="text-sm font-medium text-green-800">All races complete for this season.</p>
            <Link href="/admin/handicap" className="mt-2 inline-block text-xs text-green-700 underline underline-offset-2">
              Review handicap table →
            </Link>
          </Card>
        )}
        {actionState.type === "race_running" && (
          <Card className="bg-emerald-50 border-emerald-200">
            <p className="text-sm font-semibold text-emerald-800">{actionState.raceName} is running.</p>
            <Link
              href={`/race/${actionState.raceId}/control`}
              className="mt-2 inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Open race control →
            </Link>
          </Card>
        )}
        {actionState.type === "countdown" && (
          <Card className="bg-blue-50 border-blue-200">
            <p className="text-sm font-semibold text-blue-800">Countdown running for {actionState.raceName}.</p>
            <Link
              href={`/race/${actionState.raceId}/control`}
              className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Open race control →
            </Link>
          </Card>
        )}
        {(actionState.type === "race_today_draft" || actionState.type === "race_today_finished") && (
          <div className="flex flex-col gap-2">
            {actionState.races.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{r.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {r.status === "finished" ? "Finished" : "Draft"} · {r.start_time.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/race/${r.id}/setup`}
                      className="rounded border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                    >
                      Setup
                    </Link>
                    {r.status !== "finished" && (
                      <Link
                        href={`/race/${r.id}/control`}
                        className="rounded bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-700"
                      >
                        Control
                      </Link>
                    )}
                    {r.status === "finished" && (
                      <Link
                        href={`/race/${r.id}/results`}
                        className="rounded bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-700"
                      >
                        Results
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {actionState.type === "upcoming" && seasonStart && (
          <Card>
            <p className="text-xs text-neutral-400 mb-1">
              Next race in {actionState.daysUntil} day{actionState.daysUntil !== 1 ? "s" : ""}
            </p>
            <p className="text-sm font-semibold text-neutral-900">{actionState.nextRace.name}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {fmtDate(raceDate(seasonStart, actionState.nextRace.day_offset))} · {actionState.nextRace.start_time.slice(0, 5)}
            </p>
            <Link
              href={`/race/${actionState.nextRace.id}/setup`}
              className="mt-3 inline-flex items-center rounded border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              Open setup →
            </Link>
          </Card>
        )}
      </div>

      {/* ── Upcoming races ── */}
      {upcomingRaces.length > 0 && actionState.type !== "race_today_draft" && seasonStart && (
        <div>
          <SectionTitle>Upcoming</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {upcomingRaces.map((r) => {
              const d = raceDate(seasonStart, r.day_offset);
              const daysUntil = todayOffset != null ? r.day_offset - todayOffset : null;
              return (
                <Link
                  key={r.id}
                  href={`/race/${r.id}/setup`}
                  className="flex items-center justify-between gap-4 rounded-md border border-neutral-100 bg-white px-3 py-2.5 text-sm hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{r.name}</span>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {fmtDate(d)}{daysUntil != null && daysUntil > 0 ? ` · ${daysUntil}d` : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Latest results ── */}
      {recentFinished.length > 0 && seasonStart && (
        <div>
          <SectionTitle>Latest results</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {recentFinished.map((r) => {
              const d = raceDate(seasonStart, r.day_offset);
              return (
                <Link
                  key={r.id}
                  href={`/race/${r.id}/results`}
                  className="flex items-center justify-between gap-4 rounded-md border border-neutral-100 bg-white px-3 py-2.5 text-sm hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{r.name}</span>
                  <span className="text-xs text-neutral-400 shrink-0">{fmtDate(d)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Season stats ── */}
      {activeSeason && (
        <div>
          <SectionTitle>Season stats</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4">
              <StatBox label="Races" value={totalRaces} sub={`${finishedRaces} finished`} />
            </Card>
            <Card className="p-4">
              <StatBox label="Active helms" value={helmCount ?? "—"} />
            </Card>
            <Card className="p-4">
              <StatBox label="Active boats" value={boatCount ?? "—"} />
            </Card>
            <Card className="p-4">
              <StatBox label="Trophies awarded" value={trophyAwardCount ?? 0} />
            </Card>
          </div>
        </div>
      )}

      {/* ── Data integrity warnings ── */}
      {(helmsWithoutBoat ?? []).length > 0 && (
        <div>
          <SectionTitle>Warnings</SectionTitle>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-800 mb-2">
              {helmsWithoutBoat!.length} helm{helmsWithoutBoat!.length !== 1 ? "s" : ""} without a default boat
            </p>
            <div className="flex flex-wrap gap-1.5">
              {helmsWithoutBoat!.map((h) => (
                <Link
                  key={h.id}
                  href={`/admin/helms`}
                  className="inline-block rounded-full bg-white border border-amber-200 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100"
                >
                  {h.display_name}
                </Link>
              ))}
            </div>
            <p className="mt-2 text-xs text-amber-700">
              Helms need a default boat for PY deduction calculations.{" "}
              <Link href="/admin/helms" className="underline underline-offset-2">Edit helms →</Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/helms/new"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            + Add helm
          </Link>
          <Link
            href="/admin/boats/new"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            + Add boat
          </Link>
          <Link
            href="/admin/trophies/award"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Award trophy manually
          </Link>
          <Link
            href="/admin/handicap"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Handicap table
          </Link>
          {activeSeason && (
            <Link
              href={`/admin/seasons/${activeSeason.year}`}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Season programme
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
