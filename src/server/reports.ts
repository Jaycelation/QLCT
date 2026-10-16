import "server-only";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  eachDay,
  eachMonth,
  formatDateOnly,
  formatMonthKey,
  type DateRange,
} from "@/lib/dates";
import type { CategoryTotal } from "@/lib/finance";
import { toNumber } from "@/lib/money";

export interface SeriesPoint {
  /** "YYYY-MM-DD" for daily buckets, "YYYY-MM" for monthly ones. */
  key: string;
  income: number;
  expense: number;
  net: number;
}

const inRange = (range: DateRange) => ({ gte: range.start, lt: range.end });

export async function periodTotals(userId: string, range: DateRange) {
  const sums = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: inRange(range) },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const income = toNumber(sums.find((s) => s.type === "INCOME")?._sum.amount);
  const expense = toNumber(sums.find((s) => s.type === "EXPENSE")?._sum.amount);
  const count = sums.reduce((n, s) => n + s._count._all, 0);
  return { income, expense, net: income - expense, count };
}

export async function categoryTotals(userId: string, range: DateRange, type: TransactionType = "EXPENSE"): Promise<CategoryTotal[]> {
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type, date: inRange(range) },
    _sum: { amount: true },
  });
  if (groups.length === 0) return [];
  const categories = await prisma.category.findMany({
    where: { userId, id: { in: groups.map((g) => g.categoryId) } },
    select: { id: true, name: true, key: true, color: true, icon: true },
  });
  return groups
    .map((g) => {
      const c = categories.find((x) => x.id === g.categoryId);
      return {
        categoryId: g.categoryId,
        name: c?.name ?? "?",
        key: c?.key ?? null,
        color: c?.color ?? "#64748b",
        icon: c?.icon ?? "circle-ellipsis",
        amount: toNumber(g._sum.amount),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

async function dailyGroups(userId: string, range: DateRange) {
  return prisma.transaction.groupBy({
    by: ["date", "type"],
    where: { userId, date: inRange(range) },
    _sum: { amount: true },
  });
}

export async function dailySeries(userId: string, range: DateRange): Promise<SeriesPoint[]> {
  const groups = await dailyGroups(userId, range);
  const map = new Map<string, SeriesPoint>(
    eachDay(range).map((d) => {
      const key = formatDateOnly(d);
      return [key, { key, income: 0, expense: 0, net: 0 }];
    }),
  );
  for (const g of groups) {
    const p = map.get(formatDateOnly(g.date));
    if (!p) continue;
    if (g.type === "INCOME") p.income += toNumber(g._sum.amount);
    else p.expense += toNumber(g._sum.amount);
  }
  return [...map.values()].map((p) => ({ ...p, net: p.income - p.expense }));
}

export async function monthlySeries(userId: string, range: DateRange): Promise<SeriesPoint[]> {
  const groups = await dailyGroups(userId, range);
  const map = new Map<string, SeriesPoint>(
    eachMonth(range).map((d) => {
      const key = formatMonthKey(d);
      return [key, { key, income: 0, expense: 0, net: 0 }];
    }),
  );
  for (const g of groups) {
    const p = map.get(formatMonthKey(g.date));
    if (!p) continue;
    if (g.type === "INCOME") p.income += toNumber(g._sum.amount);
    else p.expense += toNumber(g._sum.amount);
  }
  return [...map.values()].map((p) => ({ ...p, net: p.income - p.expense }));
}

/** Sum of every account's opening balance plus all income minus all expenses. */
export async function totalBalance(userId: string): Promise<number> {
  const [accounts, sums] = await Promise.all([
    prisma.account.aggregate({ where: { userId }, _sum: { initialBalance: true } }),
    prisma.transaction.groupBy({ by: ["type"], where: { userId }, _sum: { amount: true } }),
  ]);
  const income = toNumber(sums.find((s) => s.type === "INCOME")?._sum.amount);
  const expense = toNumber(sums.find((s) => s.type === "EXPENSE")?._sum.amount);
  return toNumber(accounts._sum.initialBalance) + income - expense;
}

export async function paymentMethodTotals(userId: string, range: DateRange) {
  const groups = await prisma.transaction.groupBy({
    by: ["paymentMethod"],
    where: { userId, type: "EXPENSE", date: inRange(range) },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return groups
    .map((g) => ({ method: g.paymentMethod, amount: toNumber(g._sum.amount), count: g._count._all }))
    .sort((a, b) => b.amount - a.amount);
}

export async function largestExpenses(userId: string, range: DateRange, take = 5) {
  const rows = await prisma.transaction.findMany({
    where: { userId, type: "EXPENSE", date: inRange(range) },
    orderBy: { amount: "desc" },
    take,
    include: { category: { select: { name: true, key: true, color: true, icon: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    amount: toNumber(r.amount),
    date: formatDateOnly(r.date),
    note: r.note,
    category: r.category,
  }));
}
