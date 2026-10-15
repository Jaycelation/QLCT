/**
 * Calendar-date helpers. All "date-only" values are represented as Date objects at UTC midnight,
 * matching how Postgres `date` columns round-trip through Prisma.
 */

export type Period = "week" | "month" | "year";

export interface DateRange {
  /** Inclusive start (UTC midnight). */
  start: Date;
  /** Exclusive end (UTC midnight). */
  end: Date;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

export function utcDate(year: number, monthIndex: number, day = 1): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function parseDateOnly(value: string): Date | null {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const date = utcDate(y, mo, d);
  // Reject overflowed dates like 2026-02-31.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo || date.getUTCDate() !== d) return null;
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Today's calendar date in the app timezone, as UTC midnight. */
export function today(timeZone = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh", now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDateOnly(parts)!;
}

export function addDays(date: Date, days: number): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
}

/** Adds months, clamping the day to the target month's length (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: Date, months: number, anchorDay = date.getUTCDate()): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = utcDate(y, m + 1, 0).getUTCDate();
  return utcDate(y, m, Math.min(anchorDay, lastDay));
}

export function startOfMonth(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function monthRange(date: Date): DateRange {
  const start = startOfMonth(date);
  return { start, end: addMonths(start, 1) };
}

/** Parses "YYYY-MM" into the first day of that month; falls back to `fallback` when invalid. */
export function parseMonthParam(value: string | undefined | null, fallback: Date): Date {
  const m = value ? ISO_MONTH.exec(value) : null;
  if (!m) return startOfMonth(fallback);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return startOfMonth(fallback);
  return utcDate(Number(m[1]), month - 1, 1);
}

/** ISO week starts on Monday. */
export function startOfWeek(date: Date): Date {
  const dow = (date.getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

export function periodRange(period: Period, anchor: Date): DateRange {
  switch (period) {
    case "week": {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 7) };
    }
    case "month":
      return monthRange(anchor);
    case "year": {
      const start = utcDate(anchor.getUTCFullYear(), 0, 1);
      return { start, end: utcDate(anchor.getUTCFullYear() + 1, 0, 1) };
    }
  }
}

/** The range immediately before `range` with the same period semantics. */
export function previousPeriodRange(period: Period, anchor: Date): DateRange {
  const shifted =
    period === "week" ? addDays(anchor, -7) : period === "month" ? addMonths(startOfMonth(anchor), -1) : utcDate(anchor.getUTCFullYear() - 1, 0, 1);
  return periodRange(period, shifted);
}

export function shiftAnchor(period: Period, anchor: Date, steps: number): Date {
  if (period === "week") return addDays(anchor, 7 * steps);
  if (period === "month") return addMonths(startOfMonth(anchor), steps);
  return utcDate(anchor.getUTCFullYear() + steps, 0, 1);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function eachDay(range: DateRange): Date[] {
  const days: Date[] = [];
  for (let d = range.start; d < range.end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function eachMonth(range: DateRange): Date[] {
  const months: Date[] = [];
  for (let d = startOfMonth(range.start); d < range.end; d = addMonths(d, 1)) months.push(d);
  return months;
}
