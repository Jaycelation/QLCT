import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { formatDateOnly, today as todayDate } from "@/lib/dates";
import { toBigInt, toNumber } from "@/lib/money";
import type { recurringSchema } from "@/lib/validation";
import { assertAccountOwned } from "./accounts";
import { assertCategoryOwned } from "./categories";
import { NotFoundError } from "./errors";
import { dueOccurrences, firstOccurrenceOnOrAfter, isFinished } from "./recurring-schedule";

type RecurringData = z.output<typeof recurringSchema>;

export async function listRecurring(userId: string) {
  const rows = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true, key: true, icon: true, color: true } },
      account: { select: { id: true, name: true, color: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: [{ active: "desc" }, { nextRunDate: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: toNumber(r.amount),
    note: r.note,
    paymentMethod: r.paymentMethod,
    frequency: r.frequency,
    interval: r.interval,
    startDate: formatDateOnly(r.startDate),
    endDate: r.endDate ? formatDateOnly(r.endDate) : null,
    nextRunDate: formatDateOnly(r.nextRunDate),
    active: r.active,
    accountId: r.accountId,
    categoryId: r.categoryId,
    category: r.category,
    account: r.account,
    generatedCount: r._count.transactions,
  }));
}
export type RecurringRow = Awaited<ReturnType<typeof listRecurring>>[number];

async function assertReferences(userId: string, data: RecurringData) {
  await Promise.all([assertAccountOwned(userId, data.accountId), assertCategoryOwned(userId, data.categoryId, data.type)]);
}

function ruleData(data: RecurringData) {
  return {
    type: data.type,
    amount: toBigInt(data.amount),
    accountId: data.accountId,
    categoryId: data.categoryId,
    paymentMethod: data.paymentMethod,
    note: data.note ?? null,
    frequency: data.frequency,
    interval: data.interval,
    startDate: data.startDate,
    endDate: data.endDate,
  };
}

export async function createRecurring(userId: string, data: RecurringData, now = todayDate()) {
  await assertReferences(userId, data);
  const rule = await prisma.recurringTransaction.create({
    data: { userId, ...ruleData(data), nextRunDate: data.startDate, active: true },
  });
  await materializeDueRecurring(userId, now);
  return rule;
}

export async function updateRecurring(userId: string, id: string, data: RecurringData, now = todayDate()) {
  await assertReferences(userId, data);
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("recurring");
  // Schedule edits apply from today forward; already generated transactions are left as they are.
  const schedule = { frequency: data.frequency, interval: data.interval, startDate: data.startDate, endDate: data.endDate };
  const nextRunDate = firstOccurrenceOnOrAfter(schedule, data.startDate > now ? data.startDate : now);
  await prisma.recurringTransaction.update({
    where: { id },
    data: { ...ruleData(data), nextRunDate, active: existing.active && !isFinished(schedule, nextRunDate) },
  });
  await materializeDueRecurring(userId, now);
}

export async function setRecurringActive(userId: string, id: string, active: boolean, now = todayDate()) {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("recurring");
  let nextRunDate = existing.nextRunDate;
  if (active && nextRunDate < now) {
    // Resuming does not back-fill the paused period.
    nextRunDate = firstOccurrenceOnOrAfter(existing, now);
  }
  await prisma.recurringTransaction.update({ where: { id }, data: { active, nextRunDate } });
  if (active) await materializeDueRecurring(userId, now);
}

/** Deletes the rule; generated transactions stay (their link is cleared). */
export async function deleteRecurring(userId: string, id: string) {
  const { count } = await prisma.recurringTransaction.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("recurring");
}

/**
 * Creates the transactions that recurring rules owe up to `now`. Called when the user opens the app,
 * so no background scheduler is required. Idempotent thanks to the (recurringId, date) unique key.
 */
export async function materializeDueRecurring(userId: string, now = todayDate()): Promise<number> {
  const rules = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, nextRunDate: { lte: now } },
  });
  let created = 0;
  for (const rule of rules) {
    const { dates, next } = dueOccurrences(rule, rule.nextRunDate, now);
    await prisma.$transaction(async (tx) => {
      if (dates.length > 0) {
        const result = await tx.transaction.createMany({
          data: dates.map((date) => ({
            userId,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            type: rule.type,
            amount: rule.amount,
            date,
            note: rule.note,
            paymentMethod: rule.paymentMethod,
            recurringId: rule.id,
          })),
          skipDuplicates: true,
        });
        created += result.count;
      }
      await tx.recurringTransaction.update({
        where: { id: rule.id },
        data: { nextRunDate: next, active: !isFinished(rule, next) },
      });
    });
  }
  return created;
}
