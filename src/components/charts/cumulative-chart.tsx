"use client";

import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormat } from "@/components/shared/use-format";
import { AXIS_PROPS, ChartLegend, ChartTooltip } from "./chart-tooltip";

/** Month-to-date cumulative spending vs the previous month, aligned by day of month. */
export function CumulativeChart({ data }: { data: { day: number; current: number | null; previous: number | null }[] }) {
  const t = useTranslations("dashboard");
  const { money } = useFormat();
  return (
    <div className="space-y-3">
      <ChartLegend
        items={[
          { label: t("thisMonth"), color: "var(--chart-3)" },
          { label: t("lastMonth"), color: "var(--muted-foreground)", dashed: true },
        ]}
      />
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
            <defs>
              <linearGradient id="cum-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="day" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickFormatter={(v: number) => money(v, { compact: true })} {...AXIS_PROPS} width={64} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <ChartTooltip
                    title={`${label}`}
                    rows={[
                      ...(payload[0].payload.current !== null
                        ? [{ label: t("thisMonth"), value: money(payload[0].payload.current), color: "var(--chart-3)" }]
                        : []),
                      ...(payload[0].payload.previous !== null
                        ? [{ label: t("lastMonth"), value: money(payload[0].payload.previous), color: "var(--muted-foreground)", dashed: true }]
                        : []),
                    ]}
                  />
                ) : null
              }
            />
            <Area type="monotone" dataKey="previous" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="4 4" fill="none" dot={false} connectNulls />
            <Area type="monotone" dataKey="current" stroke="var(--chart-3)" strokeWidth={2} fill="url(#cum-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
