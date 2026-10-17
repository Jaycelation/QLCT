"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, Landmark, PiggyBank, Receipt, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDonut } from "@/components/charts/category-donut";
import { CumulativeChart } from "@/components/charts/cumulative-chart";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { BudgetBar, BudgetStatusLabel } from "@/components/shared/budget-bar";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { InsightsList } from "@/components/shared/insights-list";
import { MonthPicker } from "@/components/shared/month-picker";
import { useFormat } from "@/components/shared/use-format";
import { percent, percentChange } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/server/dashboard";
import { StatCard } from "./stat-card";

export function DashboardView({ data, userName, maxMonth }: { data: DashboardData; userName: string; maxMonth: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const { date, monthTitle, pct } = useFormat();
  const savingsRate = percent(data.totals.net, data.totals.income);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("greeting", { name: userName.split(" ").at(-1) ?? userName })}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle", { month: date(data.month, { month: "long", year: "numeric" }) })}</p>
        </div>
        <MonthPicker month={data.month} max={maxMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("totalBalance")} value={data.balance} icon={Wallet} tone="primary" footer={t("acrossAccounts", { count: data.accountCount })} />
        <StatCard label={t("monthIncome")} value={data.totals.income} previous={data.prevTotals.income} icon={TrendingUp} tone="income" />
        <StatCard label={t("monthExpense")} value={data.totals.expense} previous={data.prevTotals.expense} icon={TrendingDown} tone="expense" goodWhenUp={false} />
        <StatCard
          label={t("netSavings")}
          value={data.totals.net}
          icon={PiggyBank}
          tone="neutral"
          footer={data.totals.income > 0 ? t("savingsRate", { rate: pct(savingsRate, 1) }) : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t("incomeVsExpense")}</CardTitle>
            <CardDescription>{t("last12Months")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.series.some((p) => p.income > 0 || p.expense > 0) ? (
              <IncomeExpenseChart data={data.series} />
            ) : (
              <EmptyState icon={BarChart3} title={t("noHistory")} description={t("noDataHint")} className="py-16" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("insights")}</CardTitle>
          </CardHeader>
          <CardContent>
            <InsightsList insights={data.insights} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("spendingByCategory")}</CardTitle>
            <CardDescription>{monthTitle(data.month)}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categories.length ? (
              <CategoryDonut data={data.categories} otherLabel={tc("other")} totalLabel={t("total")} />
            ) : (
              <EmptyState icon={Receipt} title={t("noData")} description={t("noDataHint")} className="py-8" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("spendingTrend")}</CardTitle>
            <CardDescription>{t("spendingTrendSub")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.trend.some((p) => (p.current ?? 0) > 0 || (p.previous ?? 0) > 0) ? (
              <CumulativeChart data={data.trend} />
            ) : (
              <EmptyState icon={TrendingUp} title={t("noData")} description={t("noDataHint")} className="py-8" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <RecentCard data={data} />
        <BudgetsCard data={data} />
        <GoalsCard data={data} />
      </div>

      <MonthComparison series={data.series} />
    </div>
  );
}

function SeeAll({ href }: { href: string }) {
  const tc = useTranslations("common");
  return (
    <CardAction>
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href={href}>
          {tc("viewAll")} <ArrowRight />
        </Link>
      </Button>
    </CardAction>
  );
}

function RecentCard({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard");
  const ttx = useTranslations("transactions");
  const { money, date, categoryName } = useFormat();
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t("recentTransactions")}</CardTitle>
        <SeeAll href="/transactions" />
      </CardHeader>
      <CardContent>
        {data.recent.length === 0 ? (
          <EmptyState icon={Receipt} title={ttx("empty")} description={ttx("emptyHint")} className="py-6" />
        ) : (
          <ul className="space-y-3.5">
            {data.recent.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3">
                <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tx.note || categoryName(tx.category)}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {categoryName(tx.category)} · {date(tx.date, { day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
                <span className={cn("text-sm font-semibold tabular", tx.type === "INCOME" ? "text-income" : "text-expense")}>
                  {money(tx.type === "INCOME" ? tx.amount : -tx.amount, { signed: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetsCard({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard");
  const tb = useTranslations("budgets");
  const { money, categoryName } = useFormat();
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t("budgetOverview")}</CardTitle>
        <SeeAll href="/budgets" />
      </CardHeader>
      <CardContent>
        {data.budgets.length === 0 ? (
          <EmptyState icon={Target} title={t("noBudgets")} className="py-6" action={<Button asChild size="sm" variant="outline"><Link href="/budgets">{tb("add")}</Link></Button>} />
        ) : (
          <ul className="space-y-4">
            {data.budgets.slice(0, 5).map((b) => (
              <li key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{b.category ? categoryName(b.category) : tb("overall")}</span>
                  <BudgetStatusLabel state={b.state} />
                </div>
                <BudgetBar usage={b.usage} state={b.state} threshold={b.alertThreshold} />
                <p className="text-muted-foreground text-xs tabular">
                  {money(b.spent)} / {money(b.limit)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsCard({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard");
  const tg = useTranslations("goals");
  const { money, pct } = useFormat();
  return (
    <Card className="gap-4 lg:col-span-2 xl:col-span-1">
      <CardHeader>
        <CardTitle>{t("goalsOverview")}</CardTitle>
        <SeeAll href="/goals" />
      </CardHeader>
      <CardContent>
        {data.goals.length === 0 ? (
          <EmptyState icon={Landmark} title={t("noGoals")} className="py-6" action={<Button asChild size="sm" variant="outline"><Link href="/goals">{tg("add")}</Link></Button>} />
        ) : (
          <ul className="space-y-4">
            {data.goals.map((g) => (
              <li key={g.id} className="flex items-center gap-3">
                <CategoryIcon icon={g.icon} color={g.color} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.name}</span>
                    <span className="text-muted-foreground text-xs tabular">{pct(g.progress)}</span>
                  </div>
                  <Progress value={g.progress} className="bg-muted h-2" indicatorStyle={{ backgroundColor: g.color }} />
                  <p className="text-muted-foreground text-xs tabular">
                    {money(g.saved)} / {money(g.target)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MonthComparison({ series }: { series: DashboardData["series"] }) {
  const t = useTranslations("dashboard");
  const tr = useTranslations("reports");
  const { money, monthTitle, pct } = useFormat();
  const [a, setA] = useState(series.at(-2)?.key ?? series[0]?.key ?? "");
  const [b, setB] = useState(series.at(-1)?.key ?? "");
  const pa = series.find((s) => s.key === a);
  const pb = series.find((s) => s.key === b);
  if (!pa || !pb) return null;

  const rows = [
    { label: tr("income"), a: pa.income, b: pb.income, goodWhenUp: true },
    { label: tr("expense"), a: pa.expense, b: pb.expense, goodWhenUp: false },
    { label: tr("net"), a: pa.net, b: pb.net, goodWhenUp: true },
  ];
  const monthLabel = monthTitle;
  const picker = (value: string, onChange: (v: string) => void, label: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-44" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {series.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {monthLabel(s.key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("monthComparison")}</CardTitle>
        <CardDescription>{t("monthComparisonSub")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {picker(a, setA, "A")}
          <span className="text-muted-foreground hidden text-sm sm:inline">→</span>
          {picker(b, setB, "B")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-2 font-medium" />
                <th className="py-2 text-right font-medium">{monthLabel(a)}</th>
                <th className="py-2 text-right font-medium">{monthLabel(b)}</th>
                <th className="py-2 text-right font-medium">{t("difference")}</th>
                <th className="py-2 text-right font-medium">{t("change")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diff = r.b - r.a;
                const change = percentChange(r.b, r.a);
                const good = r.goodWhenUp ? diff >= 0 : diff <= 0;
                return (
                  <tr key={r.label} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{r.label}</td>
                    <td className="py-2.5 text-right tabular">{money(r.a)}</td>
                    <td className="py-2.5 text-right tabular">{money(r.b)}</td>
                    <td className={cn("py-2.5 text-right font-medium tabular", diff === 0 ? "" : good ? "text-income" : "text-expense")}>
                      {money(diff, { signed: true })}
                    </td>
                    <td className="text-muted-foreground py-2.5 text-right tabular">
                      {change === null ? "—" : `${change > 0 ? "+" : ""}${pct(change, 1)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
