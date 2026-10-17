"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { formatMoney } from "@/lib/money";

/** Locale-aware formatters for client components. */
export function useFormat() {
  const locale = useLocale();
  const tc = useTranslations("categories");
  const money = useCallback(
    (amount: number, opts: { compact?: boolean; signed?: boolean } = {}) => {
      const text = formatMoney(Math.abs(amount), { locale, compact: opts.compact });
      if (!opts.signed) return amount < 0 ? `-${text}` : text;
      return amount > 0 ? `+${text}` : amount < 0 ? `-${text}` : text;
    },
    [locale],
  );
  const date = useCallback(
    (iso: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { timeZone: "UTC", ...opts }).format(new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`)),
    [locale],
  );
  const pct = useCallback(
    (value: number, digits = 0) =>
      new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { style: "percent", maximumFractionDigits: digits }).format(value / 100),
    [locale],
  );
  /** Standalone month heading, e.g. "Tháng 10 năm 2026" / "October 2026" (only the first letter is capitalized). */
  const monthTitle = useCallback(
    (iso: string) => {
      const text = date(iso, { month: "long", year: "numeric" });
      return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
    },
    [date, locale],
  );
  /** Default categories are stored with a key and translated; custom ones show their own name. */
  const categoryName = useCallback(
    (c: { name: string; key: string | null }) => (c.key && tc.has(c.key) ? tc(c.key) : c.name),
    [tc],
  );
  return { locale, money, date, monthTitle, pct, categoryName };
}
