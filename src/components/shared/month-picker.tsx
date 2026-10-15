"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormat } from "./use-format";

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Month navigator bound to the `?month=YYYY-MM` search param. */
export function MonthPicker({ month, max }: { month: string; max: string }) {
  const t = useTranslations("common");
  const { date } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function go(next: string) {
    const p = new URLSearchParams(params.toString());
    if (next === max) p.delete("month");
    else p.set("month", next);
    const qs = p.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className="bg-card flex items-center gap-1 rounded-lg border p-1 shadow-xs">
      <Button variant="ghost" size="icon-sm" onClick={() => go(shift(month, -1))} aria-label={t("previousMonth")}>
        <ChevronLeft />
      </Button>
      <span className="flex min-w-32 items-center justify-center gap-2 text-sm font-medium capitalize">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {date(month, { month: "long", year: "numeric" })}
      </span>
      <Button variant="ghost" size="icon-sm" onClick={() => go(shift(month, 1))} disabled={month >= max} aria-label={t("nextMonth")}>
        <ChevronRight />
      </Button>
    </div>
  );
}
