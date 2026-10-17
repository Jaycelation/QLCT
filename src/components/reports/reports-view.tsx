"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryDonut } from "@/components/charts/category-donut";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { CategoryIcon } from "@/components/shared/category-icon";
import { EmptyState } from "@/components/shared/empty-state";
import { InsightsList } from "@/components/shared/insights-list";
import { useFormat } from "@/components/shared/use-format";
import { percentChange } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ReportData } from "@/server/report";
import { BarChart3 } from "lucide-react";

function shiftDate(iso: string, period: ReportData["period"], steps: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (period === "week") d.setUTCDate(d.getUTCDate() + 7 * steps);
  else if (period === "month") {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + steps);
  } else {
    d.setUTCMonth(0, 1);
    d.setUTCFullYear(d.getUTCFullYear() + steps);
  }
  return d.toISOString().slice(0, 10);
}

export function ReportsView({ report, today }: { report: ReportData; today: string }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const tp = useTranslations("paymentMethods");
  const { money, pct, date, monthTitle, categoryName } = useFormat();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const go = (period: string, d: string) =>
    startTransition(() => router.push(`${pathname}?period=${period}&date=${d}`, { scroll: false }));

  const title =
    report.period === "week"
      ? t("weekLabel", { start: date(report.start, { day: "2-digit", month: "2-digit" }), end: date(report.end) })
      : report.period === "month"
        ? monthTitle(report.start)
        : report.start.slice(0, 4);
  const canGoNext = report.end < today;
  const empty = report.totals.count === 0;
  const exportQs = `from=${report.start}&to=${report.end}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={report.period} onValueChange={(p) => go(p, report.anchor)}>
            <TabsList>
              <TabsTrigger value="week">{t("week")}</TabsTrigger>
              <TabsTrigger value="month">{t("month")}</TabsTrigger>
              <TabsTrigger value="year">{t("year")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="bg-card flex items-center gap-1 rounded-lg border p-1 shadow-xs">
            <Button variant="ghost" size="icon-sm" onClick={() => go(report.period, shiftDate(report.anchor, report.period, -1))} aria-label={tc("previous")}>
              <ChevronLeft />
            </Button>
            <span className="flex min-w-36 items-center justify-center gap-2 text-sm font-medium">
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {title}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canGoNext}
              onClick={() => {
                const next = shiftDate(report.anchor, report.period, 1);
                go(report.period, next > today ? today : next);
              }}
              aria-label={tc("next")}
            >
              <ChevronRight />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download /> {t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/api/export/report?period=${report.period}&date=${report.anchor}`} download>
                  <FileSpreadsheet /> {t("exportExcel")}
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/export/transactions?format=csv&${exportQs}`} download>
                  <FileText /> {t("exportCsv")}
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={cn("space-y-6 transition-opacity", pending && "opacity-60")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label={t("income")} value={money(report.totals.income)} change={percentChange(report.totals.income, report.prevTotals.income)} goodWhenUp />
          <Kpi label={t("expense")} value={money(report.totals.expense)} change={percentChange(report.totals.expense, report.prevTotals.expense)} goodWhenUp={false} />
          <Kpi label={t("net")} value={money(report.totals.net, { signed: true })} valueClass={report.totals.net >= 0 ? "text-income" : "text-expense"} />
          <Kpi label={t("savingsRate")} value={report.totals.income > 0 ? pct(report.savingsRate, 1) : "—"} />
          <Kpi label={t("avgDailyExpense")} value={money(report.avgDailyExpense)} sub={`${t("transactionCount")}: ${report.totals.count}`} className="col-span-2 lg:col-span-1" />
        </div>

        {empty ? (
          <Card>
            <EmptyState icon={BarChart3} title={t("noData")} />
          </Card>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>{t("trend")}</CardTitle>
                  <CardDescription>{title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <IncomeExpenseChart data={report.series} granularity={report.granularity} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("insights")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <InsightsList insights={report.insights} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("categoryBreakdown")}</CardTitle>
                <CardDescription>{title}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8 lg:grid-cols-2">
                {report.expenseCategories.length ? (
                  <CategoryDonut data={report.expenseCategories} otherLabel={tc("other")} totalLabel={t("expense")} />
                ) : (
                  <p className="text-muted-foreground text-sm">{t("noData")}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-left text-xs">
                        <th className="pb-2 font-medium">{t("category")}</th>
                        <th className="pb-2 text-right font-medium">{tc("amount")}</th>
                        <th className="pb-2 text-right font-medium">{t("share")}</th>
                        <th className="pb-2 text-right font-medium">{t("vsPrevious")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenseCategories.map((c) => {
                        const change = percentChange(c.amount, c.previous);
                        return (
                          <tr key={c.categoryId} className="border-b last:border-0">
                            <td className="py-2">
                              <span className="flex items-center gap-2">
                                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: c.color }} />
                                {categoryName(c)}
                              </span>
                            </td>
                            <td className="py-2 text-right font-medium tabular">{money(c.amount)}</td>
                            <td className="text-muted-foreground py-2 text-right tabular">{pct((c.amount / report.totals.expense) * 100, 1)}</td>
                            <td className={cn("py-2 text-right text-xs tabular", change === null ? "text-muted-foreground" : change > 0 ? "text-expense" : "text-income")}>
                              {change === null ? "—" : `${change > 0 ? "+" : ""}${pct(change)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>{t("topExpenses")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {report.top.map((tx) => (
                      <li key={tx.id} className="flex items-center gap-3">
                        <CategoryIcon icon={tx.category.icon} color={tx.category.color} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{tx.note || categoryName(tx.category)}</p>
                          <p className="text-muted-foreground text-xs">{date(tx.date)}</p>
                        </div>
                        <span className="text-expense text-sm font-semibold tabular">{money(tx.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("incomeBreakdown")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarList
                    items={report.incomeCategories.map((c) => ({ id: c.categoryId, label: categoryName(c), amount: c.amount, color: c.color }))}
                    total={report.totals.income}
                    empty={t("noData")}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t("paymentMethods")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarList
                    items={report.methods.map((m) => ({ id: m.method, label: tp(m.method), amount: m.amount, color: "var(--chart-3)" }))}
                    total={report.totals.expense}
                    empty={t("noData")}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  change,
  goodWhenUp,
  sub,
  valueClass,
  className,
}: {
  label: string;
  value: string;
  change?: number | null;
  goodWhenUp?: boolean;
  sub?: string;
  valueClass?: string;
  className?: string;
}) {
  const t = useTranslations("reports");
  const { pct } = useFormat();
  const good = change === undefined || change === null ? null : goodWhenUp ? change >= 0 : change <= 0;
  return (
    <Card className={cn("gap-1 px-4 py-4", className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("truncate text-lg font-semibold tabular", valueClass)}>{value}</p>
      {change !== undefined && change !== null ? (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <span className={cn("inline-flex items-center font-semibold", change === 0 ? "text-muted-foreground" : good ? "text-income" : "text-expense")}>
            {change === 0 ? <Minus className="size-3.5" /> : change > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {pct(Math.abs(change), 1)}
          </span>
          {t("vsPrevious")}
        </p>
      ) : sub ? (
        <p className="text-muted-foreground text-xs">{sub}</p>
      ) : null}
    </Card>
  );
}

function BarList({ items, total, empty }: { items: { id: string; label: string; amount: number; color: string }[]; total: number; empty: string }) {
  const { money, pct } = useFormat();
  if (!items.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.id} className="space-y-1">
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{i.label}</span>
            <span className="font-medium tabular">{money(i.amount)}</span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div className="h-full rounded-full" style={{ width: `${total > 0 ? (i.amount / total) * 100 : 0}%`, backgroundColor: i.color }} />
          </div>
          <p className="text-muted-foreground text-xs tabular">{pct(total > 0 ? (i.amount / total) * 100 : 0, 1)}</p>
        </li>
      ))}
    </ul>
  );
}
