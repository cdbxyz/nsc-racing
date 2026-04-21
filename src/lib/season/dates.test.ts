import { describe, it, expect } from "vitest";
import { deriveSeasonDates } from "./dates";

// Expected values from SPEC.md Section 2
const CASES = [
  { year: 2024, start: "2024-07-28", end: "2024-08-11" },
  { year: 2025, start: "2025-07-27", end: "2025-08-10" },
  { year: 2026, start: "2026-08-02", end: "2026-08-16" },
  { year: 2027, start: "2027-08-01", end: "2027-08-15" },
];

function isoDate(d: Date): string {
  // Use UTC components so the result matches the UTC-midnight dates we produce.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("deriveSeasonDates", () => {
  for (const { year, start, end } of CASES) {
    it(`${year}: start=${start}, end=${end}`, () => {
      const result = deriveSeasonDates(year);
      expect(isoDate(result.start)).toBe(start);
      expect(isoDate(result.end)).toBe(end);
    });

    it(`${year}: start is a Sunday`, () => {
      const { start: d } = deriveSeasonDates(year);
      expect(d.getDay()).toBe(0); // 0 = Sunday
    });
  }
});
