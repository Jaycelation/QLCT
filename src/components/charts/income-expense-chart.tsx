"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormat } from "@/components/shared/use-format";
import { AXIS_PROPS, ChartLegend, ChartTooltip } from "./chart-tooltip";

export interface SeriesPoint {
  key: string;
  income: number;
  expense: number;
  net: number;
}

/** Grouped monthly (or daily) bars. One shared y-scale: income and expenses are the same unit. */
export function IncomeExpenseChart({
  data,
  granularity = "month",
  height = 280,
}: {
  data: SeriesPoint[];
  granularity?: "day" | "month";
  height?: number;
}) {
  const t = useTranslations("reports");
  const { money, date } = useFormat();
  const label = (key: string) =>
    granularity === "month" ? date(key, { month: "short", year: "2-digit" }) : date(key, { day: "2-digit", month: "2-digit" });
  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: t("income"), color: "var(--income)" },
          { label: t("expense"), color: "var(--expense)" },
        ]}
      />
      <div style={{ height }} role="img" aria-label={`${t("income")} / ${t("expense")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap={data.length > 20 ? "15%" : "25%"} margin={{ left: 0, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="key" tickFormatter={label} {...AXIS_PROPS} minTickGap={8} />
            <YAxis tickFormatter={(v: number) => money(v, { compact: true })} {...AXIS_PROPS} width={64} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload, label: key }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={label(String(key))}
                    rows={[
                      { label: t("income"), value: money(payload[0].payload.income), color: "var(--income)" },
                      { label: t("expense"), value: money(payload[0].payload.expense), color: "var(--expense)" },
                      { label: t("net"), value: money(payload[0].payload.net, { signed: true }), color: "var(--muted-foreground)" },
                    ]}
                  />
                ) : null
              }
            />
            <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
