import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import * as accounts from "@/server/accounts";
import * as budgets from "@/server/budgets";
import * as categories from "@/server/categories";
import * as goals from "@/server/goals";
import * as recurring from "@/server/recurring";
import * as transactions from "@/server/transactions";
import { createUser, resetDb } from "../helpers";

const day = (s: string) => parseDateOnly(s)!;
let f: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await resetDb();
  f = await createUser("Owner");
});
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const expense = (amount: number, date: string, extra: Partial<Parameters<typeof transactions.createTransaction>[1]> = {}) =>
  transactions.createTransaction(f.user.id, {
    type: "EXPENSE",
    amount,
    date: day(date),
    accountId: f.account.id,
    categoryId: f.food.id,
    paymentMethod: "CASH",
    ...extra,
  });

describe("new users", () => {
  it("get default categories and a cash account", async () => {
    const cats = await categories.listCategories(f.user.id);
    expect(cats.filter((c) => c.type === "EXPENSE").length).toBeGreaterThanOrEqual(10);
    expect(cats.filter((c) => c.type === "INCOME").length).toBeGreaterThanOrEqual(5);
    expect(await accounts.listAccounts(f.user.id)).toHaveLength(1);
  });
});

describe("balances and search", () => {
  it("account balance = opening balance + income - expenses", async () => {
    await accounts.updateAccount(f.user.id, f.account.id, { name: "Cash", type: "CASH", initialBalance: 1_000_000, color: "#10b981" });
    await expense(200_000, "2026-10-01");
    await transactions.createTransaction(f.user.id, {
      type: "INCOME",
      amount: 500_000,
      date: day("2026-10-02"),
      accountId: f.account.id,
      categoryId: f.salary.id,
      paymentMethod: "BANK_TRANSFER",
    });
    const [acc] = await accounts.listAccounts(f.user.id);
    expect(acc.balance).toBe(1_300_000);
    expect(acc.transactionCount).toBe(2);
  });

  it("filters by text, type and inclusive date range, with totals", async () => {
    await expense(10_000, "2026-10-01", { note: "Phở bò" });
    await expense(20_000, "2026-10-05", { note: "Cà phê" });
    await expense(30_000, "2026-10-31", { note: "Phở gà" });
    const r = await transactions.listTransactions(f.user.id, {
      q: "phở",
      from: day("2026-10-01"),
      to: day("2026-10-31"),
      page: 1,
      pageSize: 20,
      sort: "amount_desc",
    });
    expect(r.items.map((i) => i.amount)).toEqual([30_000, 10_000]);
    expect(r.totals.expense).toBe(40_000);
  });

  it("accounts and categories with history can't be deleted", async () => {
    await expense(1, "2026-10-01");
    await expect(accounts.deleteAccount(f.user.id, f.account.id)).rejects.toMatchObject({ code: "accountInUse" });
    await expect(categories.deleteCategory(f.user.id, f.food.id)).rejects.toMatchObject({ code: "categoryInUse" });
  });

  it("names are unique per user, case-insensitively", async () => {
    await expect(categories.createCategory(f.user.id, { name: "ĂN UỐNG", type: "EXPENSE", icon: "car", color: "#000000" })).rejects.toMatchObject({
      code: "categoryNameTaken",
    });
    const other = await createUser("Other");
    await expect(categories.createCategory(other.user.id, { name: "Pets", type: "EXPENSE", icon: "paw-print", color: "#000000" })).resolves.toBeTruthy();
  });
});

describe("budgets", () => {
  it("compute spending per category and overall, one overall budget max", async () => {
    await expense(800_000, "2026-10-03");
    await expense(300_000, "2026-09-30");
    await budgets.upsertBudget(f.user.id, { categoryId: f.food.id, amount: 1_000_000, alertThreshold: 80 });
    await budgets.upsertBudget(f.user.id, { categoryId: null, amount: 5_000_000, alertThreshold: 80 });
    await budgets.upsertBudget(f.user.id, { categoryId: null, amount: 6_000_000, alertThreshold: 90 });

    const list = await budgets.listBudgetStatus(f.user.id, day("2026-10-01"), day("2026-10-15"));
    expect(list).toHaveLength(2);
    const [overall, food] = list;
    expect(overall).toMatchObject({ categoryId: null, limit: 6_000_000, spent: 800_000, state: "ok" });
    expect(food).toMatchObject({ spent: 800_000, state: "warning", usage: 80 });
  });

  it("only accept expense categories", async () => {
    await expect(budgets.upsertBudget(f.user.id, { categoryId: f.salary.id, amount: 1, alertThreshold: 80 })).rejects.toMatchObject({
      code: "categoryTypeMismatch",
    });
  });
});

describe("savings goals", () => {
  it("complete when the target is reached and block over-withdrawal", async () => {
    const g = await goals.createGoal(f.user.id, { name: "Laptop", targetAmount: 1_000_000, deadline: null, color: "#000000", icon: "smartphone" });
    await goals.addContribution(f.user.id, { goalId: g.id, amount: 600_000, direction: "deposit", date: day("2026-10-01") });
    await expect(
      goals.addContribution(f.user.id, { goalId: g.id, amount: 700_000, direction: "withdraw", date: day("2026-10-02") }),
    ).rejects.toMatchObject({ code: "withdrawTooLarge" });
    await goals.addContribution(f.user.id, { goalId: g.id, amount: 400_000, direction: "deposit", date: day("2026-10-03") });
    let [row] = await goals.listGoals(f.user.id);
    expect(row).toMatchObject({ status: "COMPLETED", progress: 100, milestonesReached: [25, 50, 75, 100] });

    await goals.addContribution(f.user.id, { goalId: g.id, amount: 100_000, direction: "withdraw", date: day("2026-10-04") });
    [row] = await goals.listGoals(f.user.id);
    expect(row).toMatchObject({ status: "ACTIVE", saved: 900_000 });
  });
});

describe("recurring transactions", () => {
  const rule = (start: string, extra = {}) => ({
    type: "EXPENSE" as const,
    amount: 6_500_000,
    accountId: f.account.id,
    categoryId: f.food.id,
    paymentMethod: "BANK_TRANSFER" as const,
    frequency: "MONTHLY" as const,
    interval: 1,
    startDate: day(start),
    endDate: null,
    ...extra,
  });

  it("back-fill due occurrences idempotently", async () => {
    await recurring.createRecurring(f.user.id, rule("2026-07-31"), day("2026-10-15"));
    expect(await prisma.transaction.count({ where: { userId: f.user.id } })).toBe(3); // Jul 31, Aug 31, Sep 30
    expect(await recurring.materializeDueRecurring(f.user.id, day("2026-10-15"))).toBe(0);
    expect(await recurring.materializeDueRecurring(f.user.id, day("2026-10-31"))).toBe(1);
    const dates = (await prisma.transaction.findMany({ where: { userId: f.user.id }, orderBy: { date: "asc" } })).map((t) =>
      t.date.toISOString().slice(0, 10),
    );
    expect(dates).toEqual(["2026-07-31", "2026-08-31", "2026-09-30", "2026-10-31"]);
  });

  it("stop after the end date and don't back-fill a paused period", async () => {
    await recurring.createRecurring(f.user.id, rule("2026-01-10", { endDate: day("2026-03-10") }), day("2026-10-15"));
    const r = await prisma.recurringTransaction.findFirstOrThrow({ where: { userId: f.user.id } });
    expect(r.active).toBe(false);
    expect(await prisma.transaction.count({ where: { recurringId: r.id } })).toBe(3);

    await recurring.createRecurring(f.user.id, rule("2026-10-01", { amount: 100 }), day("2026-10-01"));
    const r2 = await prisma.recurringTransaction.findFirstOrThrow({ where: { userId: f.user.id, amount: 100n } });
    await recurring.setRecurringActive(f.user.id, r2.id, false, day("2026-10-02"));
    await recurring.setRecurringActive(f.user.id, r2.id, true, day("2027-01-15"));
    expect(await prisma.transaction.count({ where: { recurringId: r2.id } })).toBe(1);
    const resumed = await prisma.recurringTransaction.findUniqueOrThrow({ where: { id: r2.id } });
    expect(resumed.nextRunDate.toISOString().slice(0, 10)).toBe("2027-02-01");
  });
});
