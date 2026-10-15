import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  goalSchema,
  recurringSchema,
  transactionSchema,
} from "./validation";
import { HttpError } from "./http";
import { nextOccurrence, today } from "./finance";
type Tx = Prisma.TransactionClient;
export async function verifyReferences(
  tx: Tx,
  userId: string,
  accountId: string,
  categoryId: string,
  type: string,
) {
  const [a, c] = await Promise.all([
    tx.account.findFirst({ where: { id: accountId, userId } }),
    tx.category.findFirst({ where: { id: categoryId, userId, type } }),
  ]);
  if (!a || !c) throw new HttpError(404, "NOT_FOUND");
}
export async function readFinance(userId: string) {
  const [accounts, categories, transactions, budgets, goals, recurring] =
    await db.$transaction([
      db.account.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.transaction.findMany({
        where: { userId },
        orderBy: [{ date: "desc" }, { id: "desc" }],
      }),
      db.budget.findMany({ where: { userId }, orderBy: { month: "desc" } }),
      db.goal.findMany({ where: { userId }, orderBy: { deadline: "asc" } }),
      db.recurring.findMany({
        where: { userId },
        orderBy: { nextDate: "asc" },
      }),
    ]);
  return { accounts, categories, transactions, budgets, goals, recurring };
}
export async function mutate(
  userId: string,
  resource: string,
  id: string | undefined,
  method: string,
  input: unknown,
) {
  return db.$transaction(
    async (tx) => {
      const where = { id, userId };
      const readers = {
        transactions: () =>
          tx.transaction.findFirst({ where, select: { id: true } }),
        accounts: () => tx.account.findFirst({ where, select: { id: true } }),
        categories: () =>
          tx.category.findFirst({ where, select: { id: true } }),
        budgets: () => tx.budget.findFirst({ where, select: { id: true } }),
        goals: () => tx.goal.findFirst({ where, select: { id: true } }),
        recurring: () =>
          tx.recurring.findFirst({ where, select: { id: true } }),
      };
      if (!Object.hasOwn(readers, resource))
        throw new HttpError(404, "NOT_FOUND");
      if (method !== "POST") {
        if (!id) throw new HttpError(400, "ID_REQUIRED");
        if (!(await readers[resource as keyof typeof readers]()))
          throw new HttpError(404, "NOT_FOUND");
      }
      if (method === "DELETE") {
        const removers = {
          transactions: () => tx.transaction.deleteMany({ where }),
          accounts: () => tx.account.deleteMany({ where }),
          categories: () => tx.category.deleteMany({ where }),
          budgets: () => tx.budget.deleteMany({ where }),
          goals: () => tx.goal.deleteMany({ where }),
          recurring: () => tx.recurring.deleteMany({ where }),
        };
        await removers[resource as keyof typeof removers]();
        return { id: id! };
      }
      if (resource === "transactions") {
        const p = transactionSchema.parse(input);
        if (p.date > today())
          throw new HttpError(400, "FUTURE_DATE_USE_RECURRING");
        await verifyReferences(tx, userId, p.accountId, p.categoryId, p.type);
        const data = { ...p, amount: BigInt(p.amount) };
        if (method === "POST")
          return tx.transaction.create({ data: { ...data, userId } });
        await tx.transaction.updateMany({ where, data });
        return { id: id! };
      }
      if (resource === "accounts") {
        const p = accountSchema.parse(input);
        const data = { ...p, openingBalance: BigInt(p.openingBalance) };
        if (method === "POST")
          return tx.account.create({ data: { ...data, userId } });
        await tx.account.updateMany({ where, data });
        return { id: id! };
      }
      if (resource === "categories") {
        const data = categorySchema.parse(input);
        if (id) {
          const used =
            (await tx.transaction.count({
              where: { userId, categoryId: id },
            })) +
            (await tx.recurring.count({ where: { userId, categoryId: id } })) +
            (await tx.budget.count({ where: { userId, categoryId: id } }));
          const old = await tx.category.findFirst({ where: { id, userId } });
          if (used && old?.type !== data.type)
            throw new HttpError(409, "CATEGORY_TYPE_IN_USE");
        }
        if (method === "POST")
          return tx.category.create({ data: { ...data, userId } });
        await tx.category.updateMany({ where, data });
        return { id: id! };
      }
      if (resource === "budgets") {
        const p = budgetSchema.parse(input);
        if (
          p.categoryId &&
          !(await tx.category.findFirst({
            where: { id: p.categoryId, userId, type: "EXPENSE" },
          }))
        )
          throw new HttpError(404, "NOT_FOUND");
        const data = {
          ...p,
          amount: BigInt(p.amount),
          scopeKey: p.categoryId ?? "ALL",
        };
        if (method === "POST")
          return tx.budget.create({ data: { ...data, userId } });
        await tx.budget.updateMany({ where, data });
        return { id: id! };
      }
      if (resource === "goals") {
        const p = goalSchema.parse(input);
        const data = { ...p, target: BigInt(p.target), saved: BigInt(p.saved) };
        if (method === "POST")
          return tx.goal.create({ data: { ...data, userId } });
        await tx.goal.updateMany({ where, data });
        return { id: id! };
      }
      if (resource === "recurring") {
        const p = recurringSchema.parse(input);
        await verifyReferences(tx, userId, p.accountId, p.categoryId, p.type);
        const data = {
          ...p,
          amount: BigInt(p.amount),
          anchorDay: Number(p.nextDate.slice(8)),
        };
        if (method === "POST")
          return tx.recurring.create({ data: { ...data, userId } });
        await tx.recurring.updateMany({ where, data });
        return { id: id! };
      }
      throw new HttpError(404, "NOT_FOUND");
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function processRecurring(userId: string, asOf = today()) {
  let created = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          created = 0;
          const rules = await tx.recurring.findMany({
            where: { userId, active: true, nextDate: { lte: asOf } },
          });
          for (const r of rules) {
            let next = r.nextDate;
            let count = 0;
            while (next <= asOf && count++ < 120) {
              const occurrenceKey = r.id + ":" + next;
              const made = await tx.transaction.createMany({
                data: [
                  {
                    userId,
                    accountId: r.accountId,
                    categoryId: r.categoryId,
                    type: r.type,
                    amount: r.amount,
                    date: next,
                    note: r.note,
                    paymentMethod: r.paymentMethod,
                    occurrenceKey,
                  },
                ],
                skipDuplicates: true,
              });
              created += made.count;
              next = nextOccurrence(next, r.interval, r.anchorDay);
            }
            await tx.recurring.updateMany({
              where: { id: r.id, userId },
              data: { nextDate: next },
            });
          }
          return { created };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2034" ||
        attempt === 2
      )
        throw e;
    }
  }
  return { created };
}
