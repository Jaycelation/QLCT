import { parseDateOnly, type Period } from "./dates";

export function parseReportParams(params: Record<string, string | string[] | undefined>, today: Date): { period: Period; anchor: Date } {
  const p = typeof params.period === "string" ? params.period : "month";
  const period: Period = p === "week" || p === "year" ? p : "month";
  const raw = typeof params.date === "string" ? parseDateOnly(params.date) : null;
  const anchor = raw && raw <= today ? raw : today;
  return { period, anchor };
}
