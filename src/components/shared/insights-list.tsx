"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { useFormat } from "./use-format";

type Tone = "good" | "bad" | "info";

/** Renders insight objects from `generateInsights` as localized sentences with a tone icon. */
export function InsightsList({ insights }: { insights: Insight[] }) {
  const t = useTranslations("insights");
  const { money, pct, categoryName } = useFormat();

  const render = (i: Insight): { text: string; tone: Tone } => {
    switch (i.kind) {
      case "topCategory":
        return { tone: "info", text: t("topCategory", { category: categoryName({ name: i.category, key: i.categoryKey }), share: pct(i.share), amount: money(i.amount) }) };
      case "expenseChange":
        return i.change > 0
          ? { tone: "bad", text: t("expenseUp", { change: pct(i.change) }) }
          : { tone: "good", text: t("expenseDown", { change: pct(Math.abs(i.change)) }) };
      case "incomeChange":
        return i.change > 0
          ? { tone: "good", text: t("incomeUp", { change: pct(i.change) }) }
          : { tone: "bad", text: t("incomeDown", { change: pct(Math.abs(i.change)) }) };
      case "savingsRate":
        return i.rate >= 20
          ? { tone: "good", text: t("savingsRateGood", { rate: pct(i.rate, 1) }) }
          : i.rate >= 10
            ? { tone: "info", text: t("savingsRateOk", { rate: pct(i.rate, 1) }) }
            : { tone: "bad", text: t("savingsRateLow", { rate: pct(i.rate, 1) }) };
      case "negativeCashflow":
        return { tone: "bad", text: t("negativeCashflow", { deficit: money(i.deficit) }) };
      case "categorySpike":
        return { tone: "bad", text: t("categorySpike", { category: categoryName({ name: i.category, key: i.categoryKey }), change: pct(i.change), amount: money(i.amount) }) };
      case "budgetsExceeded":
        return { tone: "bad", text: t("budgetsExceeded", { count: i.count }) };
      case "budgetsWarning":
        return { tone: "info", text: t("budgetsWarning", { count: i.count }) };
      case "noData":
        return { tone: "info", text: t("noData") };
    }
  };

  const icons = { good: PiggyBank, bad: AlertTriangle, info: Lightbulb };
  return (
    <ul className="space-y-3">
      {insights.map((insight, idx) => {
        const { text, tone } = render(insight);
        const Icon =
          insight.kind === "expenseChange" || insight.kind === "incomeChange"
            ? (insight.change > 0 ? TrendingUp : TrendingDown)
            : icons[tone];
        return (
          <li key={idx} className="flex gap-3 text-sm">
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                tone === "good" && "bg-income/12 text-income",
                tone === "bad" && "bg-expense/12 text-expense",
                tone === "info" && "bg-chart-3/12 text-chart-3",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="leading-relaxed">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
