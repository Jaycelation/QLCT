import { describe, expect, it } from "vitest";
import {
  addMonths,
  formatDateOnly,
  parseDateOnly,
  parseMonthParam,
  periodRange,
  previousPeriodRange,
  today,
  utcDate,
} from "@/lib/dates";

const d = (s: string) => parseDateOnly(s)!;

describe("parseDateOnly", () => {
  it("parses valid dates as UTC midnight", () => {
    expect(d("2026-02-28").toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
  it("rejects overflowing and malformed dates", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("26-1-1")).toBeNull();
  });
});

describe("addMonths", () => {
  it("clamps to the end of shorter months", () => {
    expect(formatDateOnly(addMonths(d("2026-01-31"), 1))).toBe("2026-02-28");
    expect(formatDateOnly(addMonths(d("2028-01-31"), 1))).toBe("2028-02-29");
  });
  it("restores the anchor day after a short month", () => {
    expect(formatDateOnly(addMonths(d("2026-02-28"), 1, 31))).toBe("2026-03-31");
  });
});

describe("periodRange", () => {
  it("weeks start on Monday", () => {
    const r = periodRange("week", d("2026-10-15")); // Thursday
    expect(formatDateOnly(r.start)).toBe("2026-10-12");
    expect(formatDateOnly(r.end)).toBe("2026-10-19");
  });
  it("months and years are half-open ranges", () => {
    const m = periodRange("month", d("2026-02-10"));
    expect([formatDateOnly(m.start), formatDateOnly(m.end)]).toEqual(["2026-02-01", "2026-03-01"]);
    const y = periodRange("year", d("2026-06-01"));
    expect([formatDateOnly(y.start), formatDateOnly(y.end)]).toEqual(["2026-01-01", "2027-01-01"]);
  });
  it("previous period of January is December", () => {
    const p = previousPeriodRange("month", d("2026-01-20"));
    expect(formatDateOnly(p.start)).toBe("2025-12-01");
  });
});

describe("today / parseMonthParam", () => {
  it("uses the configured timezone", () => {
    // 2026-10-15 18:30 UTC is already 16 October in Vietnam.
    const now = new Date("2026-10-15T18:30:00Z");
    expect(formatDateOnly(today("Asia/Ho_Chi_Minh", now))).toBe("2026-10-16");
    expect(formatDateOnly(today("UTC", now))).toBe("2026-10-15");
  });
  it("falls back for invalid month params", () => {
    const fallback = utcDate(2026, 9, 15);
    expect(formatDateOnly(parseMonthParam("2026-03", fallback))).toBe("2026-03-01");
    expect(formatDateOnly(parseMonthParam("2026-13", fallback))).toBe("2026-10-01");
    expect(formatDateOnly(parseMonthParam("junk", fallback))).toBe("2026-10-01");
  });
});
