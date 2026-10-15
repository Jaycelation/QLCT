import "server-only";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { toBigInt, toNumber } from "@/lib/money";
import type { TransactionFilter, transactionSchema } from "@/lib/validation";
import { assertAccountOwned } from "./accounts";
import { assertCategoryOwned } from "./categories";
import { NotFoundError } from "./errors";

type TransactionData = z.output<typeof transactionSchema>;

export const transactionInclude = {
  category: { select: { id: true, name: true, key: true, icon: true, color: true, type: true } },
  account: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TransactionInclude;

export type TransactionRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  note: string | null;
  paymentMethod: string;
  recurringId: string | null;
  category: { id: string; name: string; key: string | null; icon: string; color: string };
  account: { id: string; name: string; color: string };
};

type TransactionWithRelations = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export function serializeTransaction(t: TransactionWithRelations): TransactionRow {
  return {
    id: t.id,
    type: t.type,
    amount: toNumber(t.amount),
    date: t.date.toISOString().slice(0, 10),
    note: t.note,
    paymentMethod: t.paymentMethod,
    recurringId: t.recurringId,
    category: t.category,
    account: t.account,
  };
}

/** Builds the Prisma filter. `userId` is always applied, so filters can never widen access. */
export function buildTransactionWhere(userId: string, f: Partial<TransactionFilter>): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (f.type) where.type = f.type;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.accountId) where.accountId = f.accountId;
  if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
  if (f.from || f.to) {
    where.date = {
      ...(f.from ? { gte: f.from } : {}),
      // `to` is inclusive for users, so compare against the next day.
      ...(f.to ? { lt: addDays(f.to, 1) } : {}),
    };
  }
  if (f.q) {
    where.OR = [
      { note: { contains: f.q, mode: "insensitive" } },
      { category: { name: { contains: f.q, mode: "insensitive" } } },
      { account: { name: { contains: f.q, mode: "insensitive" } } },
    ];
  }
  return where;
}

const SORTS: Record<TransactionFilter["sort"], Prisma.TransactionOrderByWithRelationInput[]> = {
  date_desc: [{ date: "desc" }, { createdAt: "desc" }],
  date_asc: [{ date: "asc" }, { createdAt: "asc" }],
  amount_desc: [{ amount: "desc" }, { date: "desc" }],
  amount_asc: [{ amount: "asc" }, { date: "desc" }],
};

export async function listTransactions(userId: string, filter: TransactionFilter) {
  const where = buildTransactionWhere(userId, filter);
  const [items, total, sums] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: SORTS[filter.sort],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);
  const income = toNumber(sums.find((s) => s.type === "INCOME")?._sum.amount);
  const expense = toNumber(sums.find((s) => s.type === "EXPENSE")?._sum.amount);
  return {
    items: items.map(serializeTransaction),
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filter.pageSize)),
    totals: { income, expense, net: income - expense },
  };
}

/** Unpaginated, for exports. Capped to keep memory bounded. */
export async function listAllTransactions(userId: string, filter: Partial<TransactionFilter>, limit = 50_000) {
  const rows = await prisma.transaction.findMany({
    where: buildTransactionWhere(userId, filter),
    include: transactionInclude,
    orderBy: SORTS[filter.sort ?? "date_desc"],
    take: limit,
  });
  return rows.map(serializeTransaction);
}

export async function recentTransactions(userId: string, take = 8) {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    include: transactionInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(serializeTransaction);
}

export async function getTransaction(userId: string, id: string) {
  const t = await prisma.transaction.findFirst({ where: { id, userId }, include: transactionInclude });
  if (!t) throw new NotFoundError("transaction");
  return serializeTransaction(t);
}

async function assertReferences(userId: string, data: TransactionData) {
  await Promise.all([assertAccountOwned(userId, data.accountId), assertCategoryOwned(userId, data.categoryId, data.type)]);
}

export async function createTransaction(userId: string, data: TransactionData) {
  await assertReferences(userId, data);
  const t = await prisma.transaction.create({
    data: {
      userId,
      type: data.type,
      amount: toBigInt(data.amount),
      date: data.date,
      accountId: data.accountId,
      categoryId: data.categoryId,
      paymentMethod: data.paymentMethod,
      note: data.note ?? null,
    },
    include: transactionInclude,
  });
  return serializeTransaction(t);
}

export async function updateTransaction(userId: string, id: string, data: TransactionData) {
  await assertReferences(userId, data);
  const { count } = await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      type: data.type,
      amount: toBigInt(data.amount),
      date: data.date,
      accountId: data.accountId,
      categoryId: data.categoryId,
      paymentMethod: data.paymentMethod,
      note: data.note ?? null,
    },
  });
  if (count === 0) throw new NotFoundError("transaction");
  return getTransaction(userId, id);
}

export async function deleteTransactions(userId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const { count } = await prisma.transaction.deleteMany({ where: { id: { in: ids }, userId } });
  if (count === 0) throw new NotFoundError("transaction");
  return count;
}
