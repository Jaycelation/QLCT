"use client";

import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useFormat } from "@/components/shared/use-format";
import { percentChange } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * KPI tile. `goodWhenUp` decides whether an increase is shown as positive (income) or negative (expenses);
 * the arrow and sign carry the direction so it never relies on color alone.
 */
export function StatCard({
  label,
  value,
  previous,
  icon: Icon,
  tone,
  goodWhenUp = true,
  footer,
}: {
  label: string;
  value: number;
  previous?: number;
  icon: LucideIcon;
  tone: "primary" | "income" | "expense" | "neutral";
  goodWhenUp?: boolean;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("dashboard");
  const { money, pct } = useFormat();
  const change = previous === undefined ? undefined : percentChange(value, previous);
  const good = change === undefined || change === null ? null : goodWhenUp ? change >= 0 : change <= 0;
  const toneClass = {
    primary: "bg-primary/12 text-primary",
    income: "bg-income/12 text-income",
    expense: "bg-expense/12 text-expense",
    neutral: "bg-chart-3/12 text-chart-3",
  }[tone];

  return (
    <Card className="animate-fade-up gap-3 px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className={cn("truncate text-2xl font-semibold tracking-tight tabular", value < 0 && "text-expense")}>{money(value)}</p>
      <div className="text-muted-foreground flex min-h-5 items-center gap-1.5 text-xs">
        {footer ??
          (change === undefined ? null : change === null ? (
            t("noBaseline")
          ) : (
            <>
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", good ? "text-income" : "text-expense")}>
                {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {pct(Math.abs(change), 1)}
              </span>
              {t("vsLastMonth")}
            </>
          ))}
      </div>
    </Card>
  );
}
