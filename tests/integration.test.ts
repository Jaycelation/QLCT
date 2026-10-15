import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { db } from "../lib/db";
import { mutate, readFinance, processRecurring } from "../lib/service";
const run = process.env.RUN_INTEGRATION === "1" ? describe : describe.skip;
run("database authorization and recurring jobs", () => {
  let a: string,
    b: string,
    accountA: string,
    accountB: string,
    categoryA: string,
    categoryB: string,
    transactionId: string;
  beforeAll(async () => {
    const stamp = Date.now();
    const u1 = await db.user.create({
      data: {
        email: `a-${stamp}@test.local`,
        name: "A",
        passwordHash: "test-only",
      },
    });
    const u2 = await db.user.create({
      data: {
        email: `b-${stamp}@test.local`,
        name: "B",
        passwordHash: "test-only",
      },
    });
    a = u1.id;
    b = u2.id;
    accountA = (
      await db.account.create({ data: { userId: a, name: "A", kind: "BANK" } })
    ).id;
    accountB = (
      await db.account.create({ data: { userId: b, name: "B", kind: "BANK" } })
    ).id;
    categoryA = (
      await db.category.create({
        data: { userId: a, name: "A", type: "EXPENSE" },
      })
    ).id;
    categoryB = (
      await db.category.create({
        data: { userId: b, name: "B", type: "EXPENSE" },
      })
    ).id;
  });
  afterEach(async () => {
    await db.$disconnect();
  });
  afterAll(async () => {
    await db.$disconnect();
    for (const userId of [a, b].filter(Boolean)) {
      await db.transaction.deleteMany({ where: { userId } });
      await db.recurring.deleteMany({ where: { userId } });
      await db.budget.deleteMany({ where: { userId } });
      await db.goal.deleteMany({ where: { userId } });
      await db.category.deleteMany({ where: { userId } });
      await db.account.deleteMany({ where: { userId } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    await db.$disconnect();
  });
  const payload = () => ({
    accountId: accountA,
    categoryId: categoryA,
    type: "EXPENSE",
    amount: 150000,
    date: "2026-01-01",
    note: "Test",
    paymentMethod: "BANK",
  });
  it("creates and reads only owned records", async () => {
    const row = await mutate(a, "transactions", undefined, "POST", payload());
    transactionId = row.id;
    expect((await readFinance(a)).transactions).toHaveLength(1);
    expect((await readFinance(b)).transactions).toHaveLength(0);
  });
  it("blocks cross-user foreign keys and mismatched category type", async () => {
    await expect(
      mutate(a, "transactions", undefined, "POST", {
        ...payload(),
        accountId: accountB,
      }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      mutate(a, "transactions", undefined, "POST", {
        ...payload(),
        categoryId: categoryB,
      }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      mutate(a, "transactions", undefined, "POST", {
        ...payload(),
        type: "INCOME",
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("blocks IDOR updates and deletes", async () => {
    await expect(
      mutate(b, "transactions", transactionId, "PATCH", payload()),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      mutate(b, "transactions", transactionId, "DELETE", {}),
    ).rejects.toThrow("NOT_FOUND");
    expect(
      (await db.transaction.findUnique({ where: { id: transactionId } }))
        ?.amount,
    ).toBe(150000n);
  });
  it("enforces foreign-key ownership at database level", async () => {
    await expect(
      db.transaction.create({
        data: { ...payload(), userId: a, accountId: accountB, amount: 100n },
      }),
    ).rejects.toThrow();
  });
  it("blocks cross-user budget category and goal updates", async () => {
    await expect(
      mutate(a, "budgets", undefined, "POST", {
        categoryId: categoryB,
        month: "2026-01",
        amount: 1000,
      }),
    ).rejects.toThrow("NOT_FOUND");
    const goal = await mutate(a, "goals", undefined, "POST", {
      name: "A goal",
      target: 1000000,
      saved: 0,
      deadline: "2027-01-01",
      color: "#b3d977",
    });
    await expect(mutate(b, "goals", goal.id, "DELETE", {})).rejects.toThrow(
      "NOT_FOUND",
    );
  });
  it("updates and deletes owned transactions", async () => {
    await mutate(a, "transactions", transactionId, "PATCH", {
      ...payload(),
      amount: 200000,
    });
    expect(
      (await db.transaction.findUnique({ where: { id: transactionId } }))
        ?.amount,
    ).toBe(200000n);
    await mutate(a, "transactions", transactionId, "DELETE", {});
    expect(
      await db.transaction.findUnique({ where: { id: transactionId } }),
    ).toBeNull();
  });
  it("records each due occurrence only once, preserving month-end anchor", async () => {
    const { date, ...rest } = payload();
    await mutate(a, "recurring", undefined, "POST", {
      ...rest,
      nextDate: "2026-01-31",
      interval: "MONTHLY",
      active: true,
    });
    expect((await processRecurring(a, "2026-03-31")).created).toBe(3);
    expect((await processRecurring(a, "2026-03-31")).created).toBe(0);
    expect(
      (
        await db.transaction.findMany({
          where: { userId: a },
          orderBy: { date: "asc" },
        })
      ).map((x) => x.date),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
  it("protects referenced accounts from deletion", async () => {
    await expect(
      mutate(a, "accounts", accountA, "DELETE", {}),
    ).rejects.toThrow();
  });
});
