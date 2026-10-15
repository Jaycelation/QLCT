import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMoney } from "./money";

/** Server-side equivalents of `useFormat` for server components and route handlers. */
export async function getFormat() {
  const locale = await getLocale();
  const tc = await getTranslations("categories");
  const intlLocale = locale === "en" ? "en-US" : "vi-VN";
  return {
    locale,
    money: (amount: number, compact = false) => formatMoney(amount, { locale, compact }),
    date: (iso: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) =>
      new Intl.DateTimeFormat(intlLocale, { timeZone: "UTC", ...opts }).format(new Date(`${iso}T00:00:00Z`)),
    month: (d: Date) => new Intl.DateTimeFormat(intlLocale, { timeZone: "UTC", month: "long", year: "numeric" }).format(d),
    pct: (value: number, digits = 0) =>
      new Intl.NumberFormat(intlLocale, { style: "percent", maximumFractionDigits: digits }).format(value / 100),
    categoryName: (c: { name: string; key: string | null }) => (c.key && tc.has(c.key) ? tc(c.key) : c.name),
  };
}
