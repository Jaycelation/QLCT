/** Largest amount accepted anywhere in the app: 100 trillion đồng, far below Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT = 100_000_000_000_000;

export function toNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

export function toBigInt(value: number): bigint {
  return BigInt(Math.round(value));
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, currency: string, compact: boolean) {
  const key = `${locale}|${currency}|${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? "compact" : "standard",
    });
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(
  amount: number,
  opts: { locale?: string; currency?: string; compact?: boolean } = {},
): string {
  return formatter(opts.locale ?? "vi", opts.currency ?? "VND", opts.compact ?? false).format(amount);
}

/** Groups digits for display inside an input, e.g. 1500000 -> "1.500.000" (vi) or "1,500,000" (en). */
export function formatAmountInput(value: number | null, locale = "vi"): string {
  if (value === null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 0 }).format(value);
}

/** Parses user-typed amounts ("1.500.000", "1,500,000 ₫", "200k", "1.5tr") into whole đồng. */
export function parseAmountInput(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s|₫|vnd|đ/g, "");
  if (!text) return null;
  const suffix = text.match(/(k|tr|m|ty|tỷ|b)$/);
  const multipliers: Record<string, number> = { k: 1e3, tr: 1e6, m: 1e6, ty: 1e9, "tỷ": 1e9, b: 1e9 };
  if (suffix) {
    const num = Number(text.slice(0, -suffix[1].length).replace(",", "."));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * multipliers[suffix[1]]);
  }
  const digits = text.replace(/[.,]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  return Number(digits);
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}

/** Relative change in percent from previous to current; null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
