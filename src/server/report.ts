import "server-only";
import { addDays, daysBetween, formatDateOnly, periodRange, previousPeriodRange, today as todayDate, type Period } from "@/lib/dates";
import { generateInsights } from "@/lib/finance";
import { percent } from "@/lib/money";
import { listBudgetStatus } from "./budgets";
import { categoryTotals, dailySeries, largestExpenses, monthlySeries, paymentMethodTotals, periodTotals } from "./reports";

export async function getReport(userId: string, period: Period, anchor: Date, now = todayDate()) {
  const range = periodRange(period, anchor);
  const prev = previousPeriodRange(period, anchor);

  const [totals, prevTotals, expenseCats, prevExpenseCats, incomeCats, series, top, methods, budgets] = await Promise.all([
    periodTotals(userId, range),
    periodTotals(userId, prev),
    categoryTotals(userId, range, "EXPENSE"),
    categoryTotals(userId, prev, "EXPENSE"),
    categoryTotals(userId, range, "INCOME"),
    period === "year" ? monthlySeries(userId, range) : dailySeries(userId, range),
    largestExpenses(userId, range, 5),
    paymentMethodTotals(userId, range),
    period === "month" ? listBudgetStatus(userId, range.start, now) : Promise.resolve([]),
  ]);

  // Average daily spending counts only days that have happened.
  const elapsedEnd = now < range.end ? addDays(now, 1) : range.end;
  const elapsedDays = Math.max(1, daysBetween(range.start, elapsedEnd < range.start ? range.start : elapsedEnd));

  return {
    period,
    start: formatDateOnly(range.start),
    end: formatDateOnly(addDays(range.end, -1)),
    anchor: formatDateOnly(anchor),
    totals,
    prevTotals,
    savingsRate: percent(totals.net, totals.income),
    avgDailyExpense: Math.round(totals.expense / elapsedDays),
    expenseCategories: expenseCats.map((c) => ({
      ...c,
      previous: prevExpenseCats.find((p) => p.categoryId === c.categoryId)?.amount ?? 0,
    })),
    incomeCategories: incomeCats,
    series,
    granularity: period === "year" ? ("month" as const) : ("day" as const),
    top,
    methods,
    insights: generateInsights({
      income: totals.income,
      expense: totals.expense,
      previousIncome: prevTotals.income,
      previousExpense: prevTotals.expense,
      categories: expenseCats,
      previousCategories: prevExpenseCats,
      budgetsExceeded: budgets.filter((b) => b.state === "exceeded").length,
      budgetsWarning: budgets.filter((b) => b.state === "warning").length,
    }),
  };
}
export type ReportData = Awaited<ReturnType<typeof getReport>>;
