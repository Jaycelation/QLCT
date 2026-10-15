import "server-only";
import { addDays, addMonths, daysBetween, eachDay, formatDateOnly, formatMonthKey, monthRange, today as todayDate } from "@/lib/dates";
import { generateInsights } from "@/lib/finance";
import { prisma } from "@/lib/db";
import { listBudgetStatus } from "./budgets";
import { listGoals } from "./goals";
import { categoryTotals, dailySeries, monthlySeries, periodTotals, totalBalance } from "./reports";
import { recentTransactions } from "./transactions";

/** Cumulative daily spending, aligned by day-of-month so two months can share one axis. */
function cumulative(points: { key: string; expense: number }[]) {
  let sum = 0;
  return points.map((p) => (sum += p.expense));
}

export async function getDashboard(userId: string, month: Date, now = todayDate()) {
  const current = monthRange(month);
  const previous = monthRange(addMonths(month, -1));
  const isCurrentMonth = now >= current.start && now < current.end;
  const trendRange = { start: addMonths(current.start, -11), end: current.end };

  const [balance, accountCount, totals, prevTotals, series, categories, prevCategories, days, prevDays, recent, budgets, goals] =
    await Promise.all([
      totalBalance(userId),
      prisma.account.count({ where: { userId, archived: false } }),
      periodTotals(userId, current),
      periodTotals(userId, previous),
      monthlySeries(userId, trendRange),
      categoryTotals(userId, current, "EXPENSE"),
      categoryTotals(userId, previous, "EXPENSE"),
      dailySeries(userId, current),
      dailySeries(userId, previous),
      recentTransactions(userId, 7),
      listBudgetStatus(userId, month, now),
      listGoals(userId, now),
    ]);

  const curCum = cumulative(days);
  const prevCum = cumulative(prevDays);
  // Stop the current-month line at today so it doesn't flatline into the future.
  const lastDay = isCurrentMonth ? daysBetween(current.start, now) : days.length - 1;
  const trend = eachDay({ start: current.start, end: addDays(current.start, Math.max(days.length, prevDays.length)) }).map((_, i) => ({
    day: i + 1,
    current: i <= lastDay && i < curCum.length ? curCum[i] : null,
    previous: i < prevCum.length ? prevCum[i] : null,
  }));

  const insights = generateInsights({
    income: totals.income,
    expense: totals.expense,
    previousIncome: prevTotals.income,
    previousExpense: prevTotals.expense,
    categories,
    previousCategories: prevCategories,
    budgetsExceeded: budgets.filter((b) => b.state === "exceeded").length,
    budgetsWarning: budgets.filter((b) => b.state === "warning").length,
  });

  return {
    month: formatMonthKey(month),
    today: formatDateOnly(now),
    balance,
    accountCount,
    totals,
    prevTotals,
    series,
    categories,
    trend,
    recent,
    budgets,
    goals: goals.filter((g) => g.status !== "ARCHIVED").slice(0, 4),
    insights,
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
