import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { daysBetween, monthRange, today as todayDate } from "@/lib/dates";
import { computeBudgetStatus, type BudgetStatus } from "@/lib/finance";
import { toBigInt, toNumber } from "@/lib/money";
import type { budgetSchema } from "@/lib/validation";
import { assertCategoryOwned } from "./categories";
import { NotFoundError } from "./errors";

type BudgetData = z.output<typeof budgetSchema>;

export interface BudgetRow extends BudgetStatus {
  id: string;
  categoryId: string | null;
  alertThreshold: number;
  category: { id: string; name: string; key: string | null; icon: string; color: string } | null;
}

/** Budgets with actual spending for the month containing `month`. */
export async function listBudgetStatus(userId: string, month: Date, now = todayDate()): Promise<BudgetRow[]> {
  const range = monthRange(month);
  const daysInMonth = daysBetween(range.start, range.end);
  const elapsed =
    now < range.start ? 1 : now >= range.end ? daysInMonth : daysBetween(range.start, now) + 1;

  const expenseInMonth = { userId, type: "EXPENSE" as const, date: { gte: range.start, lt: range.end } };
  const [budgets, byCategory, variableByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, key: true, icon: true, color: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({ by: ["categoryId"], where: expenseInMonth, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ["categoryId"], where: { ...expenseInMonth, recurringId: null }, _sum: { amount: true } }),
  ]);
  const sumOf = (groups: typeof byCategory, categoryId: string | null) =>
    categoryId
      ? toNumber(groups.find((g) => g.categoryId === categoryId)?._sum.amount)
      : groups.reduce((s, g) => s + toNumber(g._sum.amount), 0);

  return budgets
    .map((b) => {
      const spent = sumOf(byCategory, b.categoryId);
      const variable = sumOf(variableByCategory, b.categoryId);
      return {
        id: b.id,
        categoryId: b.categoryId,
        alertThreshold: b.alertThreshold,
        category: b.category,
        ...computeBudgetStatus(toNumber(b.amount), spent, b.alertThreshold, elapsed, daysInMonth, variable),
      };
    })
    .sort((a, b) => (a.categoryId === null ? -1 : b.categoryId === null ? 1 : b.usage - a.usage));
}

/** Creates or replaces the budget for a category (or the overall budget when categoryId is null). */
export async function upsertBudget(userId: string, data: BudgetData) {
  if (data.categoryId) await assertCategoryOwned(userId, data.categoryId, "EXPENSE");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.budget.findFirst({ where: { userId, categoryId: data.categoryId } });
    const values = { amount: toBigInt(data.amount), alertThreshold: data.alertThreshold };
    if (existing) return tx.budget.update({ where: { id: existing.id }, data: values });
    return tx.budget.create({ data: { userId, categoryId: data.categoryId, ...values } });
  });
}

export async function updateBudget(userId: string, id: string, data: BudgetData) {
  const existing = await prisma.budget.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("budget");
  if (data.categoryId) await assertCategoryOwned(userId, data.categoryId, "EXPENSE");
  if (data.categoryId !== existing.categoryId) {
    // Moving onto a category that already has a budget replaces that one.
    await prisma.budget.deleteMany({ where: { userId, categoryId: data.categoryId, id: { not: id } } });
  }
  return prisma.budget.update({
    where: { id },
    data: { categoryId: data.categoryId, amount: toBigInt(data.amount), alertThreshold: data.alertThreshold },
  });
}

export async function deleteBudget(userId: string, id: string) {
  const { count } = await prisma.budget.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("budget");
}
