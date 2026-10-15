"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useFormat } from "@/components/shared/use-format";
import { cn } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";

export interface CategorySlice {
  categoryId: string;
  name: string;
  key: string | null;
  color: string;
  amount: number;
}

const MAX_SLICES = 6;

/**
 * Category share. Colors follow each category's own color (identity, not rank).
 * Beyond six categories the tail folds into "Other" so the donut stays readable.
 */
export function CategoryDonut({ data, otherLabel, totalLabel }: { data: CategorySlice[]; otherLabel: string; totalLabel: string }) {
  const { money, pct, categoryName } = useFormat();
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const slices = sorted.length > MAX_SLICES
    ? [
        ...sorted.slice(0, MAX_SLICES - 1).map((d) => ({ ...d, label: categoryName(d) })),
        {
          categoryId: "other",
          name: otherLabel,
          key: null,
          color: "#94a3b8",
          label: otherLabel,
          amount: sorted.slice(MAX_SLICES - 1).reduce((s, d) => s + d.amount, 0),
        },
      ]
    : sorted.map((d) => ({ ...d, label: categoryName(d) }));
  const shown = active !== null ? slices[active] : null;

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,200px)_1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="var(--card)"
              strokeWidth={2}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
              isAnimationActive
            >
              {slices.map((s, i) => (
                <Cell key={s.categoryId} fill={s.color} opacity={active === null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip
              content={({ active: on, payload }) =>
                on && payload?.length ? (
                  <ChartTooltip
                    title={String(payload[0].name)}
                    rows={[{ label: pct((Number(payload[0].value) / total) * 100, 1), value: money(Number(payload[0].value)), color: String(payload[0].payload.color) }]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-muted-foreground max-w-[60%] truncate text-xs">{shown ? shown.label : totalLabel}</span>
          <span className="text-base font-semibold tabular">{money(shown ? shown.amount : total, { compact: true })}</span>
        </div>
      </div>
      <ul className="space-y-2.5">
        {slices.map((s, i) => (
          <li
            key={s.categoryId}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={cn("flex items-center gap-3 text-sm transition-opacity", active !== null && active !== i && "opacity-50")}
          >
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="text-muted-foreground w-12 text-right text-xs tabular">{pct((s.amount / total) * 100)}</span>
            <span className="w-28 text-right font-medium tabular">{money(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
