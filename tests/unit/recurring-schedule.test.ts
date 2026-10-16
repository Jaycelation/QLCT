import { describe, expect, it } from "vitest";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import { dueOccurrences, firstOccurrenceOnOrAfter, nextOccurrence, type Schedule } from "@/server/recurring-schedule";

const d = (s: string) => parseDateOnly(s)!;
const fmt = (ds: Date[]) => ds.map(formatDateOnly);

describe("recurring schedule", () => {
  it("keeps the month-end anchor across short months", () => {
    const s: Schedule = { frequency: "MONTHLY", interval: 1, startDate: d("2026-01-31"), endDate: null };
    const { dates } = dueOccurrences(s, s.startDate, d("2026-05-01"));
    expect(fmt(dates)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("supports intervals and weekly rules", () => {
    const s: Schedule = { frequency: "WEEKLY", interval: 2, startDate: d("2026-10-01"), endDate: null };
    expect(formatDateOnly(nextOccurrence(s, s.startDate))).toBe("2026-10-15");
  });
  it("stops at the end date and reports the next cursor", () => {
    const s: Schedule = { frequency: "DAILY", interval: 1, startDate: d("2026-10-01"), endDate: d("2026-10-03") };
    const { dates, next } = dueOccurrences(s, s.startDate, d("2026-10-10"));
    expect(fmt(dates)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(formatDateOnly(next)).toBe("2026-10-04");
  });
  it("caps a single run", () => {
    const s: Schedule = { frequency: "DAILY", interval: 1, startDate: d("2020-01-01"), endDate: null };
    expect(dueOccurrences(s, s.startDate, d("2026-01-01"), 50).dates).toHaveLength(50);
  });
  it("finds the first occurrence on or after a date", () => {
    const s: Schedule = { frequency: "YEARLY", interval: 1, startDate: d("2024-02-29"), endDate: null };
    expect(formatDateOnly(firstOccurrenceOnOrAfter(s, d("2025-01-01")))).toBe("2025-02-28");
    expect(formatDateOnly(firstOccurrenceOnOrAfter(s, d("2027-03-01")))).toBe("2028-02-29");
  });
});
