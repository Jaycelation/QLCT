"use client";

/** Tooltip body shared by all charts. Text uses text tokens; the swatch carries series identity. */
export function ChartTooltip({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color: string; dashed?: boolean }[];
}) {
  return (
    <div className="bg-popover text-popover-foreground min-w-40 rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-[2px]"
                style={r.dashed ? { border: `1.5px dashed ${r.color}` } : { backgroundColor: r.color }}
              />
              {r.label}
            </span>
            <span className="font-medium tabular">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={i.dashed ? { border: `2px dashed ${i.color}` } : { backgroundColor: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export const AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
