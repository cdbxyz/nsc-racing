# NSC Racing Tool — Claude Code Prompts

Nine build-phase prompts. Each one is self-contained and is designed to be pasted into a **fresh** Claude Code session. Every phase assumes the previous phases are already merged to `main`; the repo state is the source of truth, not any prior Claude Code conversation.

**Workflow per phase:**
1. Start a new Claude Code session in the repo root.
2. Paste the prompt for the current phase.
3. Let Claude Code finish, review the diff, commit, and push.
4. Verify the "Done when" checklist at the bottom of the prompt.
5. Start a fresh session for the next phase.

All business rules and the full data model live in `SPEC.md` at the repo root. Every prompt refers to it rather than restating the rules.

---

## Phase 0 — One-time setup (do before Phase 1)

These are things you do yourself once, no Claude Code needed:

1. Create an empty GitHub repo, e.g. `nsc-racing-tool`. Clone it locally. Add `SPEC.md` and this `PROMPTS.md` to the repo root and commit.
2. Create a Supabase project at supabase.com. Note the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from Settings → API.
3. Create a Vercel project linked to the GitHub repo. Set the three Supabase env vars plus `NSC_WRITE_PASSPHRASE` (choose a passphrase, e.g. `nefyn2026`). Set them on Production, Preview, and Development.
4. Install the Supabase CLI locally: `npm install -g supabase`. Run `supabase login`.

Now you're ready for Phase 1.

---

## Phase 1 — Scaffold

```
Read SPEC.md in the repo root in full before you begin. You'll refer to it in every subsequent phase; for this phase you just need the tech stack (Section 2 if it appears, or the top of the file otherwise) and the goals.

Goal: scaffold a Next.js 15 App Router project in TypeScript with Tailwind CSS, shadcn/ui, and a Supabase client. Get it deploying cleanly to Vercel.

Assumed repo state: empty repo with only SPEC.md and PROMPTS.md at the root.

Tasks:
1. Initialise Next.js 15 with the App Router, TypeScript (strict mode), Tailwind, and ESLint. Use the `src/` directory layout.
2. Install and configure shadcn/ui with a neutral base colour. Install initial primitives: button, input, label, card, dialog, dropdown-menu, toast, table.
3. Install `@supabase/supabase-js` and `@supabase/ssr`. Create `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` following the Supabase SSR patterns — server client reads cookies, browser client uses the anon key.
4. Create `src/lib/supabase/service.ts` that returns a service-role client using `SUPABASE_SERVICE_ROLE_KEY`. This client is ONLY for use in server actions and route handlers that have passed the passphrase gate; never expose it to the browser.
5. Add date-fns and @tanstack/react-query. Set up a `<Providers>` component that wraps the app with a QueryClientProvider.
6. Replace the default home page with a minimal landing page: NSC logo placeholder (text only is fine), club name, "Next race" placeholder, "Results" placeholder link. Tailwind styled, mobile-first.
7. Add a sensible README.md with: local setup steps, env vars needed, how to run the dev server.
8. Configure the project to deploy to Vercel from the main branch. Verify the build passes locally with `npm run build`.

Constraints:
- Do NOT add authentication libraries (NextAuth, Clerk, Supabase Auth). The passphrase gate comes in Phase 3.
- Do NOT add a database schema yet. Phase 2 handles that.
- Keep dependencies minimal. No UI kits beyond shadcn, no state libraries beyond react-query.
- Commit in logical chunks with descriptive messages.

Done when:
- `npm run dev` starts and shows the landing page at localhost:3000.
- `npm run build` passes with no TypeScript errors, no ESLint errors.
- Pushing to main triggers a successful Vercel deploy.
- The deployed URL renders the landing page.
- `src/lib/supabase/{server,client,service}.ts` all exist and compile, even though no queries are wired up yet.
```

---

## Phase 2 — Database schema and seed data

```
Read SPEC.md in the repo root in full before you begin. Sections 2, 3, 4, 5, and 6 are the source of truth for this phase.

Goal: create the full Postgres schema via Supabase migrations, seed the trophy registry and the standard programme template, and generate TypeScript types.

Assumed repo state: Phase 1 is merged. Next.js app deploys. No schema exists yet.

Tasks:
1. Run `supabase init` to create the local Supabase config. Link it to the remote project: `supabase link --project-ref <ref>`.
2. Create a migration `supabase/migrations/0001_initial_schema.sql` implementing every table listed in SPEC.md Section 6, with these specifics:
   - UUID primary keys via `gen_random_uuid()` defaults.
   - `created_at timestamptz default now()` on every table.
   - `updated_at timestamptz` with a trigger that updates on row UPDATE.
   - Foreign keys with ON DELETE RESTRICT where the relationship is structural (e.g., `race_entries.racer_id`) and ON DELETE CASCADE only for child rows (`lap_times.race_entry_id`, `race_trophies.race_id`).
   - `race_entries.status` as a Postgres enum: 'racing', 'FIN', 'DNF', 'DNS', 'DSQ', 'RET', 'OCS', 'DNC'.
   - `seasons.status` as enum: 'draft', 'locked'.
   - `races.status` as enum: 'draft', 'running', 'finished'.
   - `trophies.accumulator_group` nullable text, with a CHECK constraint restricting values to 'francis_1', 'francis_2', 'garside', or NULL.
   - Add indexes on all foreign keys, plus a composite index on `race_entries(race_id, racer_id)` (unique) and `lap_times(race_entry_id, lap_number)` (unique).
3. Create `supabase/migrations/0002_seed_trophies.sql` inserting every trophy from SPEC.md Section 3 with the name, a short description, and eligibility_notes copied directly from the NSC card. Set accumulator_group to NULL for all (accumulator membership lives on races, not trophies).
4. Create `supabase/migrations/0003_seed_programme_template.sql` that creates a reusable SQL function `create_season_from_template(p_year int)` which:
   - Computes `start_date` as (last Monday of August of p_year) - 29 days; raises an error if the result isn't a Sunday (sanity check).
   - Inserts a row in `seasons` with status='draft', year=p_year.
   - Inserts 15 `races` rows for days 0..14 of the fortnight, name 'Race 1'..'Race 15', start_time defaulting to 14:00 local, with day 10 handled as two races named 'Race 10a' (13:00) and 'Race 10b' (15:00) — so actually 16 race rows total.
   - Sets `use_base_py_only = true` on day 5 (Barnes/Arnold Bell), day 9 (Crowther), and day 14 (Richard Burrell/Austin Ladies).
   - Sets `is_pursuit = true` on day 9 (Crowther).
   - Inserts `race_trophies` rows linking each race to its trophies per SPEC.md Section 2's programme table. display_order 0 = main trophy, 1 = secondary.
   - Returns the new season_id.
5. Enable Row Level Security on every table. Policy: `anon` role gets SELECT on every table; no anon INSERT/UPDATE/DELETE. The service role bypasses RLS so writes are gated by the passphrase middleware at the app layer.
6. Run `supabase db push` to apply migrations to the remote.
7. Generate TypeScript types: `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`. Wire the types into the Supabase clients from Phase 1.
8. Add a `/api/health` route that does a trivial SELECT from `trophies` using the server client and returns `{ ok: true, trophyCount: N }`. This is our end-to-end smoke test.

Constraints:
- No business logic in SQL beyond what's described above (the create_season_from_template function is infrastructure, not business logic).
- Don't seed any boats, racers, or classes — those come from the admin UI in Phase 4.
- Every migration must be reversible in principle (no destructive ops).

Done when:
- `supabase db push` completes with no errors.
- Visiting `/api/health` on the deployed Vercel URL returns `{ ok: true, trophyCount: 25 }`.
- `src/lib/supabase/database.types.ts` exists and matches the schema.
- Calling `select * from create_season_from_template(2026)` in the Supabase SQL editor creates a valid 16-race season with start_date = 2026-08-02 and end_date = 2026-08-16, and can be repeated for 2027 (start 2027-08-01, end 2027-08-15).
```

---

## Phase 3 — Passphrase gate

```
Read SPEC.md Section 7 (Passphrase gate) before you begin.

Goal: add a shared-passphrase write gate. Public reads stay open. Write operations go through Next.js middleware that checks a signed cookie set via a simple unlock page.

Assumed repo state: Phases 1 and 2 merged. Schema exists, types generated.

Tasks:
1. Create `/unlock` page — a single form with a passphrase input and submit button. Submitting POSTs to `/api/unlock`.
2. `/api/unlock` route handler: reads the posted passphrase, compares to `process.env.NSC_WRITE_PASSPHRASE` via a constant-time comparison, and on match sets an HTTP-only secure cookie `nsc_unlocked` whose value is a signed token (HMAC-SHA256 of the passphrase hash + a random server salt stored in env). Cookie expires in 30 days.
3. Add `src/middleware.ts` that runs on all routes matching `/admin/**`, `/race/*/control`, `/race/*/setup`, and `/api/admin/**`. If the request doesn't have a valid `nsc_unlocked` cookie, redirect to `/unlock?next=<original_path>`.
4. Provide a server-only helper `requireUnlocked()` in `src/lib/auth/gate.ts` that can be called at the top of any server action to assert the cookie is valid. Throws a typed error that translates to a 401 response.
5. Build a tiny `<LockStatus />` client component shown in the app header: when unlocked, shows "Officer mode" + a Lock button that clears the cookie; when locked, shows a Padlock icon linking to /unlock.
6. Update the root layout to include `<LockStatus />` on every page.

Security notes:
- Use `timingSafeEqual` for passphrase comparison.
- Never return the passphrase in any response or log it.
- Keep the env var `NSC_WRITE_PASSPHRASE` out of any client bundle — it must only be read in server code.

Done when:
- Visiting `/admin` or `/race/.../control` without the cookie redirects to `/unlock`.
- Submitting the correct passphrase sets the cookie and redirects back to the original URL.
- Submitting the wrong passphrase shows a non-revealing error ("passphrase not recognised").
- The Lock button clears the cookie and the next admin visit redirects to /unlock.
- Public pages (/, /trophies, /race/[id]/results) are reachable without the cookie.
- The passphrase is not present in any client-side JS bundle (check the Vercel deployment's chunks).
```

---

## Phase 4 — Admin CRUD

```
Read SPEC.md Sections 3, 6, and 7 before you begin.

Goal: build admin screens to manage boat_classes, boats, racers, and trophies.

Assumed repo state: Phases 1-3 merged. Passphrase gate active.

Tasks:
1. Create `/admin` layout with sidebar navigation: Classes, Boats, Racers, Trophies, Seasons (Seasons is a placeholder link for Phase 5).
2. Each entity page has the same pattern:
   - Table view of all rows, sortable by name/most-recent.
   - "Add new" button opens a dialog with a form.
   - Each row has Edit (dialog) and Delete (confirm dialog) actions.
   - Server actions handle create/update/delete, using the service-role Supabase client after `requireUnlocked()`.
3. Specific field validation:
   - boat_classes: name required and unique, base_py positive integer, default_laps positive number (allow decimals for fractional-lap classes).
   - boats: sail_number string required (can include letters), class_id required.
   - racers: full_name required, display_name optional (defaults to first name).
   - trophies: name required and unique, eligibility_notes optional free text.
4. Deleting a racer, boat, or class must be blocked at the DB level if they're referenced from race_entries (FK ON DELETE RESTRICT from Phase 2). Surface this as a friendly error: "Can't delete — this racer has race results. Archive instead?". Add an `archived boolean` column to racers, boats, and classes via a migration `0004_add_archived.sql`, and filter archived=false by default in the tables with a toggle to show archived.
5. Use optimistic updates + react-query where it simplifies the UX; otherwise server actions with form revalidation are fine.

Constraints:
- Don't build the "current handicap delta" UI for racers here — that's Phase 9.
- No bulk import / CSV upload in v1.

Done when:
- Officer can add a full complement of classes (say, Laser, Topper, Pico, Mirror) with realistic PY values.
- Officer can add boats referencing those classes, racers with default boats, and see trophies (pre-seeded from Phase 2).
- Edits and deletes work with the archiving fallback for referenced entities.
- Every CRUD action is blocked for a locked (public) visitor.
```

---

## Phase 5 — Season template and race editing

```
Read SPEC.md Section 2 (Season structure) in full before you begin.

Goal: add the "New season from template" flow plus a per-season race editor.

Assumed repo state: Phases 1-4 merged.

Tasks:
1. Create `/admin/seasons` listing all seasons (year, status, start/end dates, number of races).
2. "New season" button: opens a dialog asking for the year. On confirm, call the `create_season_from_template(year)` SQL function from Phase 2 via a server action, then redirect to `/admin/seasons/[year]`.
3. `/admin/seasons/[year]` shows the 16 races (Race 1 through Race 15, with Race 10 split into 10a and 10b) in a list. Each race is editable while the season is in status='draft':
   - Date (default: season_start + day_offset).
   - Start time.
   - Reference laps (default: max laps_to_sail among entrants, but no entrants exist yet at this stage, so default from the trophy template notes if available, or 3).
   - Course description.
   - `use_base_py_only` checkbox.
   - Attached trophies: list with add/remove and reorder (display_order).
4. Write `src/lib/season/dates.ts` exporting `deriveSeasonDates(year: number): { start: Date; end: Date }` and unit test it with vitest for 2024, 2025, 2026, 2027 (expected values in SPEC.md Section 2). The SQL function is the authoritative implementation; this TS helper is for client-side date display only.
5. Display the season status prominently. When the first race in the season transitions to 'running' (not yet possible — happens in Phase 7), the season should auto-lock. Implement a SQL trigger for this in migration `0005_auto_lock_season.sql`: AFTER UPDATE on races, if OLD.status = 'draft' AND NEW.status = 'running', update the parent season to status='locked'.
6. Once locked, the race editor shows all fields read-only with a banner: "Season locked — first race has started."

Constraints:
- Do not build race entry or race control screens here — Phase 6 handles entries, Phase 7 handles the live control screen.
- The create_season_from_template function is idempotent on (year) by virtue of a unique constraint on seasons.year from Phase 2; if not already present, add a migration adding that unique constraint.

Done when:
- Officer can create a 2026 season and see 16 races dated 2026-08-02 through 2026-08-16, with Race 10a/10b on Aug 11.
- Editing a race's start time, reference laps, or trophies persists and re-renders.
- Attempting to create a season for a year that already exists returns a friendly error.
- `vitest run` passes for the date derivation tests.
- Locking behaviour works in principle (can be tested by manually updating a race's status to 'running' in the SQL editor).
```

---

## Phase 6 — Race setup (entries)

```
Read SPEC.md Sections 2, 4, 6, and 7 (Race setup) before you begin.

Goal: add a per-race setup screen for picking entrants, assigning boats and lap counts.

Assumed repo state: Phases 1-5 merged. A 2026 season exists with editable races.

Tasks:
1. Create `/race/[id]/setup` reachable from the season page via a "Set up" button on each race.
2. Top of page: race header (name, date, start time, course notes, trophies). Read-only here — those are edited on the season page.
3. Entrant picker:
   - Searchable list of all non-archived racers.
   - Each racer row shows: name, default boat class, default boat sail number, current `personal_py_delta`.
   - Checkbox to add to the race. Adding creates a `race_entries` row with status='racing', snapshotting the racer's current `personal_py_delta`, base_py (from their default boat's class), and computing effective_py.
   - Once added, allow per-entry overrides: different boat, different laps_to_sail (defaults from the class's default_laps).
4. "Reference laps" field on the race — defaults to max `laps_to_sail` among current entrants, editable. Show a live preview: "3 laps will be the reference. Boat X (2 laps) will be pro-rated to 3."
5. Build `src/lib/handicap/snapshot.ts` with `computeEntrySnapshot(racerId, boatOverrideId?)` that reads racer + boat + class, applies personal_py_delta, and returns `{ base_py, personal_py_delta, effective_py, class_id, laps_to_sail }`. Re-use this in every entry-creation path.
6. Validation:
   - Each racer can only appear once per race.
   - At least one entrant is required before a race can be started.
   - Block entry changes once the race is status='running' or 'finished'.

Constraints:
- Do not implement the "Start race" button here — it belongs in the control screen (Phase 7).
- Do not compute results here — Phase 8.

Done when:
- Officer can add 5+ racers to Race 1, override one racer's boat, and override another's laps_to_sail.
- Reference laps preview updates live as entrants are added.
- Re-adding an already-entered racer is blocked with a clear error.
- Each race_entries row has the correct snapshotted PY values.
```

---

## Phase 7 — Race control (live lap recording)

```
Read SPEC.md Section 7 (Race control) in full before you begin. This is the most important screen in the whole tool.

Goal: a mobile-first live race screen where the officer taps a big Lap button per racer to record cumulative elapsed time.

Assumed repo state: Phases 1-6 merged. A race has entrants.

Tasks:
1. Create `/race/[id]/control`.
2. Header: race name, a big Start / Finish button, elapsed race clock, connection status indicator.
3. Before start: layout shows the entrant list in read-only form. "Start race" stamps `races.start_time`, updates status to 'running' (triggering season auto-lock from Phase 5), and re-renders.
4. After start: main area is a large, vertical, tap-friendly list of entries, one row per racer:
   - Racer name and class (large), sail number (smaller).
   - Lap progress badge: `2 / 3`.
   - Current elapsed time (updates once per second for entries still racing).
   - A BIG primary button: **LAP** — tap records the current elapsed time into `lap_times` (lap_number = next integer). When `lap_number == laps_to_sail`, also sets `race_entries.status = 'FIN'` and `finish_time_ms = elapsed_at_tap`.
   - Kebab menu per row for: DNF, RET, DSQ, OCS, DNS, Undo last lap.
5. Offline tolerance:
   - Capture the tap's timestamp client-side immediately (monotonic: `performance.now()` anchored once against the server start_time).
   - Mutations go through react-query with retry + exponential backoff. On a failed mutation, keep it in a pending queue visible in the UI ("2 pending writes"); auto-flush when the network returns.
   - Do NOT block the UI while waiting for server confirmation — show the row as "pending" (subtle spinner) until confirmed, then "confirmed".
6. Finish race: visible once all entries are FIN/DNF/DNS/DSQ/RET/OCS. Stamps `races.status = 'finished'` and triggers the result computation (Phase 8 supplies the function; here you call it).
7. Per-row Undo: removes the most recent lap_times row for that entry and reverts status to 'racing' if they were FIN. Require a confirm tap.

UX must-haves:
- Tap targets minimum 48px high.
- High contrast. Usable in bright daylight.
- Zero accidental double-lap risk: after a successful Lap tap, the button is debounced for 1.5 seconds (subtle progress ring) and cannot register another lap for that racer.
- The page MUST function end-to-end without JavaScript errors on iOS Safari (typical officer device).

Constraints:
- No result computation here — Finish just hands off to Phase 8's function.
- No trophy awards here — that's Phase 8.

Done when:
- On a test race with 5 entrants, officer can Start, tap laps at plausible speeds, flag one racer as DNF, finish the race.
- All lap_times rows are recorded correctly with cumulative_elapsed_ms.
- Airplane-mode test: disable network mid-race, tap 3 laps, re-enable network; all 3 writes flush and reconcile.
- Accidental double-taps (within 1.5s) do not produce duplicate lap rows.
- Undo removes the most recent lap and reverts FIN to racing if applicable.
```

---

## Phase 8 — Results computation, public results page, trophy awards

```
Read SPEC.md Sections 3, 4, and 5 in full before you begin. These are the scoring rules.

Goal: compute corrected times, rank the fleet, display a public results page, and let the officer award trophies with the cascade rule and the 3%/+1% deduction.

Assumed repo state: Phases 1-7 merged. A race can be finished.

Tasks:
1. Write `src/lib/scoring/compute.ts` with `computeRaceResults(raceId: string)`:
   - Reads the race, its `reference_laps`, `use_base_py_only`, and all race_entries + lap_times.
   - For each entry with status='FIN':
     - `elapsed_ms = last_lap.cumulative_elapsed_ms`
     - `normalised_elapsed_ms = elapsed_ms × (reference_laps / laps_to_sail)`
     - `effective_py = use_base_py_only ? base_py_snapshot : (base_py_snapshot + personal_py_delta_snapshot)`
     - `corrected_ms = normalised_elapsed_ms × (1000 / effective_py)`
   - Rank all FIN entries by ascending corrected_ms → `position_overall`.
   - Compute `position_class` within each class_id_snapshot bucket.
   - Non-FIN entries get null positions and null corrected_ms.
   - Writes everything back in a single transaction.
2. Hook into Phase 7's "Finish race" — it calls `computeRaceResults` before returning.
3. Create the public results page `/race/[id]/results`:
   - Table: Position (overall), Racer, Boat class + sail number, Laps, Elapsed, Normalised, Corrected, Gap to 1st.
   - Non-finishers listed below with their status (DNF, DNS, etc.).
   - Class position shown as a secondary column.
   - "Copy share link" button (clipboard API) that copies the page's public URL with a toast confirmation.
   - Responsive, print-friendly CSS (basic: hide header and footer on print, ensure table prints on one page).
4. Trophy award flow (officer-only section on the same page):
   - Section heading: "Award trophies".
   - For each trophy on the race (ordered by display_order), show a card:
     - Trophy name + eligibility_notes.
     - Proposed winner: highest-ranked entrant who has NOT already been awarded another trophy on this race day (cascade Rule A).
     - Dropdown to override with any finisher.
     - "Confirm" button.
   - Confirming a trophy:
     - Writes a `trophy_awards` row.
     - Applies the personal handicap deduction: read how many trophy_awards this racer already has in this season (count before this one), set delta = base_py × (0.03 for first, 0.01 for each subsequent), atomically `UPDATE racers SET personal_py_delta = personal_py_delta - delta`, insert a `personal_handicap_history` row with the before/after values and the trophy_award_id.
     - Must happen in a single transaction. Use a Postgres function `apply_trophy_award(p_race_id, p_trophy_id, p_racer_id)` to keep it atomic.
   - Undo button per awarded trophy:
     - Deletes the trophy_award, reverses the deduction by re-adding delta, inserts a compensating personal_handicap_history row.
     - Must also happen in a transaction.
5. Once all trophies for a race are confirmed, display a "Trophies awarded" summary banner on the public results page.

Constraints:
- Accumulator trophies are NOT awarded here. If a trophy has `accumulator_group` set, skip it in the award flow (we're not in scope for accumulators).
- The 3%/+1% rule: the FIRST trophy awarded to a racer in the season gets 3% of base_py; every subsequent one gets 1% of base_py. Base_py is the current base_py of the boat they used in the winning race's entry (via base_py_snapshot). Query counts only confirmed (not rolled-back) trophy_awards.

Done when:
- Finishing a race produces a ranked results page with correct corrected times (verify with a hand calculation on a small test race).
- A 2-lap boat in a 3-lap race is pro-rated correctly (spot-check with the SPEC worked example).
- A "base PY only" race uses base_py_snapshot, ignoring personal_py_delta_snapshot, in the computation.
- Awarding the main trophy → cascade proposes the next eligible racer for the second trophy.
- A racer's `personal_py_delta` decreases by 3% of their base_py on their first trophy, 1% on each subsequent.
- Undoing a trophy award reverses the delta exactly.
- The Copy share link button works in iOS Safari.
- Public results page is reachable without the passphrase cookie.
```

---

## Phase 9 — Dashboard, trophy cabinet, handicap admin, polish

```
Read SPEC.md Section 7 in full.

Goal: tie everything together with public-facing summary pages and an officer-only handicap admin view. Polish.

Assumed repo state: Phases 1-8 merged. Full race workflow works end to end.

Tasks:
1. Dashboard `/`:
   - "Next race" card: the next race (by date) in the current season that isn't finished. Shows date, start time, name, trophies, and a "Set up" or "Open race control" button (officer-only, gated).
   - "Latest results" card: the most recent finished race, showing top 3 on corrected time and a link to the full results.
   - "Trophy tally this season" card: racers ranked by number of trophies won this season.
2. Trophy cabinet `/trophies`:
   - List every trophy from the registry, grouped alphabetically.
   - Each trophy shows: current season's winner (if awarded), last season's winner, and a chronological list of all past winners.
3. Officer handicap view `/admin/handicap`:
   - Table of every non-archived racer with: full name, default boat/class, base_py, current personal_py_delta, effective_py, trophies won this season.
   - Click a row to expand a history log: every deduction entry from personal_handicap_history, chronological, most recent first. Each row shows the triggering trophy, the race date, py before and after.
   - "Reset season deltas" button with confirm: sets all racers' personal_py_delta to 0 and inserts a personal_handicap_history marker row per racer with reason='season reset'. Use this at the start of each new season.
4. Empty states:
   - "No season yet" → button to create one.
   - "No racers yet" → link to admin.
   - "No races finished yet" → helpful placeholder.
5. Error boundaries: every server action surfaces its error in a toast with a copyable error ID. Log full errors to the server console; never leak stack traces to the UI.
6. Print styles on /race/[id]/results: clean page break, hide nav, header shows race name + date + NSC logo text.
7. Accessibility pass: every interactive element is keyboard accessible, form controls have labels, colour contrast meets WCAG AA.
8. Add a small "About / feedback" link in the footer pointing to a mailto for the commodore.

Constraints:
- No new business rules in this phase — everything here is UI polish around the data the prior phases already produce.

Done when:
- Dashboard accurately reflects current season state in all three cards.
- Trophy cabinet shows the full registry with winners resolved per season.
- Handicap admin shows per-racer current delta and full history; reset-deltas action works atomically.
- Results page prints cleanly on A4.
- Lighthouse score on / and /race/*/results is green on Performance, Accessibility, and Best Practices.
```

---

## After all nine phases

- Walk through a full test race with real-ish data. Record the edge cases you find and add them as issues.
- Take a hand-calculated results sheet from a past NSC race and compare against the tool's output end-to-end.
- Set `NSC_WRITE_PASSPHRASE` to a real club passphrase in Vercel production.
- Share the deployed URL + passphrase with the other officers. Hand the public URL to the sailing committee.

Follow-up items parked until after the first full fortnight in production:
- Crowther Pursuit Race format (staggered starts).
- President's Trophy flexible format.
- Accumulator scoring (Francis #1, Francis #2, Garside).
- Tom Roberts U12 Cup ad-hoc race insertion.
- CSV export.
- Custom printable sheet matching the existing NSC results paper format.
