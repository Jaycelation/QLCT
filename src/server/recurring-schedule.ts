import type { Frequency } from "@prisma/client";
import { addDays, addMonths } from "@/lib/dates";

export interface Schedule {
  frequency: Frequency;
  interval: number;
  startDate: Date;
  endDate: Date | null;
}

/** The occurrence after `current`. Monthly/yearly rules keep the start date's day (clamped to month length). */
export function nextOccurrence(schedule: Schedule, current: Date): Date {
  const anchorDay = schedule.startDate.getUTCDate();
  switch (schedule.frequency) {
    case "DAILY":
      return addDays(current, schedule.interval);
    case "WEEKLY":
      return addDays(current, 7 * schedule.interval);
    case "MONTHLY":
      return addMonths(current, schedule.interval, anchorDay);
    case "YEARLY":
      return addMonths(current, 12 * schedule.interval, anchorDay);
  }
}

/** First occurrence on or after `date`. */
export function firstOccurrenceOnOrAfter(schedule: Schedule, date: Date, maxSteps = 100_000): Date {
  let d = schedule.startDate;
  for (let i = 0; d < date && i < maxSteps; i++) d = nextOccurrence(schedule, d);
  return d;
}

/**
 * Occurrences from `from` up to and including `until`, honouring `endDate`. `limit` stops a long-idle
 * daily rule from generating unbounded rows in one go; the rest are picked up next run.
 */
export function dueOccurrences(schedule: Schedule, from: Date, until: Date, limit = 400): { dates: Date[]; next: Date } {
  const dates: Date[] = [];
  let d = from;
  while (d <= until && dates.length < limit && (!schedule.endDate || d <= schedule.endDate)) {
    dates.push(d);
    d = nextOccurrence(schedule, d);
  }
  return { dates, next: d };
}

export function isFinished(schedule: Schedule, next: Date): boolean {
  return schedule.endDate !== null && next > schedule.endDate;
}
