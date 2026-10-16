import "server-only";
import type { Prisma, TransactionType } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { DEFAULT_ACCOUNT, DEFAULT_CATEGORIES } from "@/lib/constants";
import type { categorySchema } from "@/lib/validation";
import { ConflictError, NotFoundError } from "./errors";

type CategoryInput = z.output<typeof categorySchema>;

export async function listCategories(userId: string, opts: { type?: TransactionType; includeArchived?: boolean } = {}) {
  return prisma.category.findMany({
    where: { userId, ...(opts.type ? { type: opts.type } : {}), ...(opts.includeArchived ? {} : { archived: false }) },
    orderBy: [{ type: "asc" }, { archived: "asc" }, { key: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  });
}

/** Ensures the category belongs to the user and matches the transaction type. */
export async function assertCategoryOwned(userId: string, categoryId: string, type?: TransactionType) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { type: true } });
  if (!category) throw new NotFoundError("category");
  if (type && category.type !== type) throw new ConflictError("categoryTypeMismatch");
}

async function assertNameFree(userId: string, type: TransactionType, name: string, exceptId?: string) {
  const clash = await prisma.category.findFirst({
    where: { userId, type, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new ConflictError("categoryNameTaken");
}

export async function createCategory(userId: string, input: CategoryInput) {
  await assertNameFree(userId, input.type, input.name);
  return prisma.category.create({ data: { userId, ...input } });
}

export async function updateCategory(userId: string, id: string, input: CategoryInput) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("category");
  if (existing.type !== input.type) {
    const used = await prisma.transaction.count({ where: { categoryId: id, userId } });
    if (used > 0) throw new ConflictError("categoryTypeLocked");
  }
  await assertNameFree(userId, input.type, input.name, id);
  // Renaming a default category turns it into a custom label (the UI stops translating it).
  const key = existing.key && existing.name === input.name ? existing.key : null;
  return prisma.category.update({ where: { id }, data: { ...input, key } });
}

export async function setCategoryArchived(userId: string, id: string, archived: boolean) {
  const { count } = await prisma.category.updateMany({ where: { id, userId }, data: { archived } });
  if (count === 0) throw new NotFoundError("category");
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await prisma.category.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new NotFoundError("category");
  const [txCount, recurringCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id, userId } }),
    prisma.recurringTransaction.count({ where: { categoryId: id, userId } }),
  ]);
  if (txCount > 0 || recurringCount > 0) throw new ConflictError("categoryInUse");
  await prisma.category.delete({ where: { id } });
}

/** Gives a brand-new user a default wallet and the standard category set. */
export async function provisionNewUser(userId: string, tx: Prisma.TransactionClient = prisma) {
  await tx.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ userId, key: c.key, name: c.name, type: c.type, icon: c.icon, color: c.color })),
    skipDuplicates: true,
  });
  await tx.account.create({ data: { userId, ...DEFAULT_ACCOUNT } });
}
