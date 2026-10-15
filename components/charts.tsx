"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
export const palette = [
  "#b9d88f",
  "#bca9da",
  "#efc884",
  "#87b9ae",
  "#e6a195",
  "#96b8da",
];
export function CashChart({
  data,
  incomeLabel,
  expenseLabel,
  format,
}: {
  data: { name: string; income: number; expenses: number }[];
  incomeLabel: string;
  expenseLabel: string;
  format: (n: number) => string;
}) {
  return (
    <div
      className="chart"
      role="img"
      aria-label={incomeLabel + " / " + expenseLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={5}
          margin={{ left: -14, right: 8, top: 15, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--line)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickFormatter={(n) =>
              n >= 1e6 ? `${n / 1e6}m` : n >= 1000 ? `${n / 1000}k` : n
            }
          />
          <Tooltip
            cursor={{ fill: "var(--hover)" }}
            contentStyle={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "var(--panel)",
              color: "var(--text)",
            }}
            formatter={(v, name) => [
              format(Number(v)),
              name === "income" ? incomeLabel : expenseLabel,
            ]}
          />
          <Bar
            dataKey="income"
            fill="#b9d88f"
            radius={[5, 5, 0, 0]}
            maxBarSize={25}
          />
          <Bar
            dataKey="expenses"
            fill="#384b43"
            radius={[5, 5, 0, 0]}
            maxBarSize={25}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function SpendingChart({
  data,
  total,
  format,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  format: (n: number) => string;
}) {
  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="69%"
              outerRadius="95%"
              paddingAngle={3}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => format(Number(v))}
              contentStyle={{
                borderRadius: 12,
                background: "var(--panel)",
                color: "var(--text)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span>VND</span>
          <strong>
            {new Intl.NumberFormat("vi-VN", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(total)}
          </strong>
        </div>
      </div>
      <div className="donut-legend">
        {data.slice(0, 5).map((d) => (
          <div key={d.name}>
            <span>
              <i style={{ background: d.color }} />
              {d.name}
            </span>
            <b>{total ? Math.round((d.value / total) * 100) : 0}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
