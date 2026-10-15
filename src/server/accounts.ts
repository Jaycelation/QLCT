import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { toBigInt, toNumber } from "@/lib/money";
import type { accountSchema } from "@/lib/validation";
import { ConflictError, NotFoundError } from "./errors";

type AccountInput = z.output<typeof accountSchema>;

export interface AccountWithBalance {
  id: string;
  name: string;
  type: string;
  color: string;
  archived: boolean;
  initialBalance: number;
  balance: number;
  transactionCount: number;
}

export async function listAccounts(userId: string, opts: { includeArchived?: boolean } = {}): Promise<AccountWithBalance[]> {
  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({
      where: { userId, ...(opts.includeArchived ? {} : { archived: false }) },
      orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);
  return accounts.map((a) => {
    let balance = toNumber(a.initialBalance);
    let transactionCount = 0;
    for (const s of sums) {
      if (s.accountId !== a.id) continue;
      const amount = toNumber(s._sum.amount);
      balance += s.type === "INCOME" ? amount : -amount;
      transactionCount += s._count._all;
    }
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      archived: a.archived,
      initialBalance: toNumber(a.initialBalance),
      balance,
      transactionCount,
    };
  });
}

export async function assertAccountOwned(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId }, select: { id: true } });
  if (!account) throw new NotFoundError("account");
}

async function assertNameFree(userId: string, name: string, exceptId?: string) {
  const clash = await prisma.account.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ConflictError("accountNameTaken");
}

export async function createAccount(userId: string, input: AccountInput) {
  await assertNameFree(userId, input.name);
  return prisma.account.create({
    data: { userId, name: input.name, type: input.type, color: input.color, initialBalance: toBigInt(input.initialBalance) },
  });
}

export async function updateAccount(userId: string, id: string, input: AccountInput) {
  await assertAccountOwned(userId, id);
  await assertNameFree(userId, input.name, id);
  return prisma.account.update({
    where: { id },
    data: { name: input.name, type: input.type, color: input.color, initialBalance: toBigInt(input.initialBalance) },
  });
}

export async function setAccountArchived(userId: string, id: string, archived: boolean) {
  const { count } = await prisma.account.updateMany({ where: { id, userId }, data: { archived } });
  if (count === 0) throw new NotFoundError("account");
}

/** Accounts with history cannot be deleted (it would rewrite past reports); archive them instead. */
export async function deleteAccount(userId: string, id: string) {
  await assertAccountOwned(userId, id);
  const [txCount, recurringCount] = await Promise.all([
    prisma.transaction.count({ where: { accountId: id, userId } }),
    prisma.recurringTransaction.count({ where: { accountId: id, userId } }),
  ]);
  if (txCount > 0 || recurringCount > 0) throw new ConflictError("accountInUse");
  await prisma.account.delete({ where: { id } });
}
