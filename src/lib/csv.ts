/**
 * Neutralizes spreadsheet formula injection: a cell starting with = + - @ (or tab/CR) is executed by
 * Excel/Sheets, so such text values get a leading apostrophe. Numbers are left untouched.
 */
export function sanitizeCell(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel shows Vietnamese characters correctly. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCsv(sanitizeCell(cell))).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
