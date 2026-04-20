# NSC Racing Tool — Functional Specification

What the tool does. Not how it's built — implementation sits in `PROMPTS.md` alongside this file.

---

## 1. Purpose

A web tool to run the Nefyn Sailing Club fortnight race programme: record lap times, compute Portsmouth Yardstick corrected results, manage trophies, and apply the club's personal handicap deduction system.

### In scope
- Running the 15-race fortnight end-to-end.
- Per-lap split recording with auto-computed corrected time using the NSC pro-rate method.
- Personal PY deductions (2% per trophy win, resets each season).
- Base-PY-only race days where personal deductions are disabled.
- Manual trophy awards with multi-trophy cascade logic.
- A season template the commodore clones each year.

### Out of scope for v1
- Crowther Pursuit Race format — winner can be recorded manually.
- President's Trophy — format is TBD each year.
- Accumulator series scoring (Francis #1, Francis #2, Garside). Races carry the accumulator metadata, but no aggregate scoring.
- Tom Roberts U12 Cup (ad hoc, commodore's discretion).
- Member accounts, online entry, subs, fees.
- Start-line automation (no OCS detection).
- CSV export, custom printable sheet, member-facing notifications.

---

## 2. Season structure

Every NSC season is a **15-day fortnight**, Sunday to Sunday, anchored to the England & Wales August bank holiday Monday (last Monday of August).

**Derivation rule:**
```
season_start = last_monday_of_august(year) − 29 days   (always a Sunday)
season_end   = season_start + 14 days                  (the second Sunday)
```

| Year | Aug BH Mon | Season start | Season end |
|---|---|---|---|
| 2024 | Mon 26 Aug | Sun 28 Jul | Sun 11 Aug |
| 2025 | Mon 25 Aug | Sun 27 Jul | Sun 10 Aug |
| 2026 | Mon 31 Aug | Sun 2 Aug  | Sun 16 Aug |
| 2027 | Mon 30 Aug | Sun 1 Aug  | Sun 15 Aug |

Default race start: **14:00**. Exception: Day 10 (middle Tuesday) runs a double header — Jones Cup at 13:00, Wilcocks Trophy at 15:00.

### Standard programme (seeded template)

Offsets are counted from the season start Sunday (offset 0 = Sunday of week 1).

| Day | Offset | Weekday | Race(s) | Default trophies | Accumulator tags | Special |
|-----|--------|---------|---------|------------------|------------------|---------|
| 1 | 0 | Sun | Race 1 | Whitaker Cup | Francis #1, Garside | |
| 2 | 1 | Mon | Race 2 | Keen Trophy | Francis #1, Garside | |
| 3 | 2 | Tue | Race 3 | Caeau Capel Cup | Francis #1, Garside | |
| 4 | 3 | Wed | Race 4 | Coventry Cup (long dist), Fabian Gaughan Veteran's Trophy (over 50) | Francis #1, Garside | Longer course |
| 5 | 4 | Thu | Race 5 | Barnes Shield (U18), Arnold Bell (over 18) | Francis #1, Garside | **Base PY only** |
| 6 | 5 | Fri | Race 6 | Spencer Trophy (U12ft), Tim Murphy Trophy (over 12ft) | Francis #1, Garside | |
| 7 | 6 | Sat | Race 7 | Commodore's Tankard, Tom Roche Trophy (over 45) | Francis #2, Garside | |
| 8 | 7 | Sun | Race 8 | Lifeboat Bay Race | Francis #2, Garside | Ty-Coch landing |
| 9 | 8 | Mon | Race 9 | Crowther Cup | Francis #2, Garside | **Pursuit — manual entry only in v1**, **Base PY only** |
| 10 | 9 | Tue | Race 10a + Race 10b | Jones Cup (13:00), Wilcocks Trophy (15:00) | Francis #2, Garside | Double header |
| 11 | 10 | Wed | Race 11 | Partington Cannon, Errwood Challenge (single-handed in 2-man boat) | Francis #2, Garside | |
| 12 | 11 | Thu | Race 12 | Andy's Andicap, Downes Trophy | Francis #2, Garside | |
| 13 | 12 | Fri | Race 13 | Craven Cup | — | |
| 14 | 13 | Sat | Race 14 | Richard Burrell Trophy, Austin Ladies Cup | — | **Base PY only** |
| 15 | 14 | Sun | Race 15 | Gill Relay | — | |

### Season lifecycle
1. Commodore creates next year's season from the template. Tool derives dates and clones race + trophy rows.
2. Season is in `draft` — any race can be edited (dates, trophies, start time, course notes, base-PY flag).
3. Once the first race is started, the season `locks` and no more structural edits.

---

## 3. Trophies

Trophies are named, persistent entities. Each race carries one or more trophies. Awards are manual — the officer picks winners — but the tool ranks the fleet on corrected time so the pick is trivial.

### Trophy registry (seeded)

Whitaker Cup, Keen Trophy, Caeau Capel Cup, Coventry Cup, Fabian Gaughan Veteran's Trophy, Barnes Shield, Arnold Bell, Spencer Trophy, Tim Murphy Trophy, Commodore's Tankard, Tom Roche Trophy, Lifeboat Bay Race, Crowther Cup, Jones Cup, Wilcocks Trophy, Partington Cannon, Errwood Challenge, Andy's Andicap, Downes Trophy, Craven Cup, Richard Burrell Trophy, Austin Ladies Cup, Gill Relay, Presidents Trophy, Tom Roberts U12 Cup.

Each trophy has a free-text `eligibility_notes` field (e.g., "Over 50", "U18", "Single-handed in 2-man boat"). The tool **does not** auto-filter eligibility — the officer reads the note and picks the right racer.

### Multi-trophy cascade (Rule A)

When a race has multiple trophies:
1. Tool ranks the fleet by corrected time.
2. Officer confirms the **main trophy winner** (top-of-list trophy on the race).
3. For each subsequent trophy, the tool proposes the **highest-ranked eligible racer who has not already won a trophy that day**.
4. Officer confirms or overrides.
5. A racer may only hold one trophy per race day.

### Award triggers
- Confirming a trophy award triggers the 2% personal handicap deduction (see Section 5).
- Trophy awards can be rolled back — doing so reverses the deduction too.

---

## 4. Portsmouth Yardstick calculation

```
if race.use_base_py_only:
    effective_py = base_py_snapshot
else:
    effective_py = base_py_snapshot + personal_py_delta_snapshot

elapsed_ms         = finish_time_ms − race.start_time_ms
normalised_elapsed = elapsed_ms × (reference_laps / laps_sailed)
corrected_ms       = normalised_elapsed × (1000 / effective_py)
```

Rank by ascending `corrected_ms`. Both `normalised_elapsed_ms` and `corrected_ms` are stored for display.

`reference_laps` is per-race — defaults to the maximum `laps_to_sail` among entrants, editable by the officer. This is how NSC currently pro-rates: a 2-lap boat in a 3-lap race has `(elapsed / 2) × 3` normalised elapsed before PY correction.

PY values used in the formula are **snapshotted onto `race_entries`** at race start, so editing a boat class later never moves a past result.

---

## 5. Personal handicap deduction system

### Rule
- A racer's **first** trophy win of the season deducts **3% of their boat's base PY**.
- Every **subsequent** trophy win of the season deducts an additional **1% of their boat's base PY**.
- All percentages are of base PY (the boat class's published PY), not of current effective PY — so deductions accumulate linearly.
- The total delta resets to zero at the start of each new season. History is preserved.
- Applies for **every trophy** won, including wins on "base PY only" race days (the race itself uses base PY, but the win still counts toward that racer's future personal delta).
- Does not apply for accumulator trophies (out of scope in v1).

### Effect on corrected time (worked example)
Laser base PY = 1100. Deduction reduces effective PY, which increases the `1000/PY` multiplier, making corrected time larger — i.e., serial winners get handicapped harder.

| Wins this season | Deduction | Effective PY | 60-min corrected |
|---|---|---|---|
| 0 | — | 1100 | 3272.7 s |
| 1 | 3% (33 pts) | 1067 | 3373.9 s |
| 2 | +1% (11 pts) | 1056 | 3409.1 s |
| 3 | +1% (11 pts) | 1045 | 3444.9 s |

### History
Every deduction is logged: racer, season, race, trophy that triggered it, PY delta before and after. Rolling back a trophy award reverses the deduction and writes a compensating log entry.

---

## 6. Data model (conceptual)

```
seasons           id, year, start_date, end_date, status (draft|locked)
boat_classes      id, name, base_py, default_laps, notes
boats             id, class_id, sail_number, name, colour, notes
racers            id, full_name, display_name, default_boat_id, personal_py_delta, notes
trophies          id, name, description, eligibility_notes, accumulator_group

races             id, season_id, day_offset, name, start_time, reference_laps,
                  course_description, use_base_py_only, is_pursuit, status, notes
race_trophies     race_id, trophy_id, display_order
race_entries      id, race_id, racer_id, boat_id,
                  class_id_snapshot, base_py_snapshot, personal_py_delta_snapshot,
                  effective_py_snapshot, laps_to_sail, status,
                  finish_time_ms, elapsed_ms, normalised_elapsed_ms, corrected_ms,
                  position_overall, position_class
lap_times         id, race_entry_id, lap_number, cumulative_elapsed_ms
trophy_awards     id, race_id, trophy_id, racer_id, notes, awarded_at
personal_handicap_history
                  id, racer_id, season_id, race_id, trophy_award_id,
                  py_delta_before, py_delta_after, reason
```

Snapshot columns on `race_entries` freeze PY values at race start. `status` on `race_entries` covers `racing | FIN | DNF | DNS | DSQ | RET | OCS | DNC`.

---

## 7. Functional screens

Descriptions are what each screen *does*, not how it's built.

### Dashboard (public)
Next race today if any. Last race's podium. Fortnight-so-far trophy tally. List of upcoming races.

### Race control (officer, passphrase required)
Mobile-first. Start button that stamps the race start time once. Per-racer row with a single **Lap** tap target and a menu for DNF / RET / DSQ / OCS / DNS. Taps record cumulative elapsed; once a racer hits their `laps_to_sail`, they're auto-flagged finished. **Finish race** button closes the race and runs the corrected-time ranking. Tolerant of intermittent connectivity — taps are queued and flushed when the connection returns.

### Race setup (officer)
Pick entrants from the racer list. Each entrant row shows default boat, class, and default laps; any can be overridden for this race. Reference laps defaults to the max among entrants, editable. Course notes, start time.

### Results (public read, officer awards)
Public ranked table: position, racer, boat, class, laps completed, elapsed, normalised elapsed, corrected, margin to 1st. Copy-to-share button for the race URL.

Officer-only section on the same page: **Award trophies**. Tool proposes winners using the cascade rule. Officer confirms or overrides. Confirming locks in the award and applies the 2% deduction.

### Trophies (public)
Trophy cabinet. Each trophy shows current-season winner, last-season winner, full all-time list.

### Admin
CRUD for boat classes, boats, racers, and trophies. "New season from template" button. Handicap admin page showing current `personal_py_delta` per racer, full history log, and rollback action on any trophy award.

### Passphrase gate
Read is public. Every write action requires a shared club passphrase. Officer unlocks once per device via a simple unlock page and the session is remembered.

### Share link
Every race's results page has a one-click copy-to-clipboard for its public URL.

---

## 8. Open flag needing confirmation

**Deduction direction and basis.** Current spec: each deduction reduces effective PY (as in the Section 5 worked example), and all percentages are of **base PY** (so deductions accumulate linearly, not compounding). Worked example in Section 5 shows the effect. If either assumption doesn't match the boat-house noticeboard, flag it and I'll flip.

---

## 9. Decisions log

- **Maths**: standard PY, `corrected = elapsed × (ref_laps / laps_sailed) × (1000 / effective_py)`.
- **Start line**: single shared start per race.
- **Personal PY**: 3% of base PY for the first trophy win of the season, +1% of base PY per subsequent trophy win. All percentages off base PY (not compounding). Resets each season, history preserved.
- **Trophy trigger**: winning any specific named trophy triggers the deduction.
- **Multi-trophy days**: one trophy per racer per day, cascade Rule A.
- **Base-PY-only race days**: days 5, 9, and 14. Wins still trigger the deduction.
- **Season dates**: derived from `last Monday of August − 29 days`, editable per season.
- **Season template**: seeded, editable in draft, locks at first race start.
- **Seed data**: deferred; ship empty, load later.
- **Auth**: shared passphrase on writes; reads public.
- **Wins tracked**: by trophy.

---

*Last updated: 2026-04-20*
