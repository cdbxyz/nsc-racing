/**
 * Client-side date derivation for NSC season dates (SPEC Section 2).
 * The SQL function create_season_from_template is authoritative;
 * this helper is for display-only computations in the browser.
 *
 * Derivation:
 *   bank_holiday_mon = last Monday of August(year)
 *   start = bank_holiday_mon - 29 days  (always a Sunday)
 *   end   = start + 14 days
 */
export function deriveSeasonDates(year: number): { start: Date; end: Date } {
  // Use UTC throughout to avoid local-timezone midnight-rollback issues.
  // Last Monday of August: start from Aug 31, walk back to dow=1 (Monday).
  const aug31 = new Date(Date.UTC(year, 7, 31)); // month is 0-indexed
  const dow = aug31.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Days to subtract to reach Monday: (dow + 6) % 7
  const daysBack = (dow + 6) % 7;
  const bankHolidayMon = new Date(Date.UTC(year, 7, 31 - daysBack));

  const start = new Date(bankHolidayMon);
  start.setUTCDate(start.getUTCDate() - 29);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 14);

  return { start, end };
}

/** Return a Date for season start + dayOffset days (UTC midnight). */
export function raceDate(start: Date, dayOffset: number): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}
