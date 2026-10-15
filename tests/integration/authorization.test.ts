import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { NotFoundError } from "@/server/errors";
import * as accounts from "@/server/accounts";
import * as budgets from "@/server/budgets";
import * as categories from "@/server/categories";
import * as goals from "@/server/goals";
import * as recurring from "@/server/recurring";
import * as transactions from "@/server/transactions";
import { categoryTotals, periodTotals, totalBalance } from "@/server/reports";
import { createUser, resetDb } from "../helpers";

// Server actions resolve the user from the session cookie. Here the session is mocked so we can
// prove that ids sent by the client are always combined with the *session* user.
const session = vi.hoisted(() => ({ user: null as null | { id: string; email: string; name: string; locale: "vi"; currency: string } }));
vi.mock("@/server/auth/current-user", () => ({
  requireUser: async () => {
    if (!session.user) throw new Error("NEXT_REDIRECT");
    return session.user;
  },
  getCurrentUser: async () => session.user,
  getCurrentSession: async () => (session.user ? { user: session.user, sessionId: "s" } : null),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const day = (s: string) => parseDateOnly(s)!;

type Fixture = Awaited<ReturnType<typeof createUser>>;
let alice: Fixture;
let bob: Fixture;
let aliceTxId: string;

beforeAll(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb();
  alice = await createUser("Alice");
  bob = await createUser("Bob");
  const tx = await transactions.createTransaction(alice.user.id, {
    type: "EXPENSE",
    amount: 120_000,
    date: day("2026-10-10"),
    accountId: alice.account.id,
    categoryId: alice.food.id,
    paymentMethod: "CASH",
    note: "Alice lunch",
  });
  aliceTxId = tx.id;
});

const input = (f: Fixture) => ({
  type: "EXPENSE" as const,
  amount: 50_000,
  date: day("2026-10-11"),
  accountId: f.account.id,
  categoryId: f.food.id,
  paymentMethod: "CASH" as const,
});

describe("transactions are isolated per user", () => {
  it("another user cannot read, list, update or delete them", async () => {
    await expect(transactions.getTransaction(bob.user.id, aliceTxId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(transactions.updateTransaction(bob.user.id, aliceTxId, input(bob))).rejects.toBeInstanceOf(NotFoundError);
    await expect(transactions.deleteTransactions(bob.user.id, [aliceTxId])).rejects.toBeInstanceOf(NotFoundError);

    const list = await transactions.listTransactions(bob.user.id, { page: 1, pageSize: 20, sort: "date_desc" });
    expect(list.total).toBe(0);
    // Alice's row is untouched.
    expect((await transactions.getTransaction(alice.user.id, aliceTxId)).amount).toBe(120_000);
  });

  it("filters cannot widen access to someone else's account or category", async () => {
    const list = await transactions.listTransactions(bob.user.id, {
      page: 1,
      pageSize: 20,
      sort: "date_desc",
      accountId: alice.account.id,
      categoryId: alice.food.id,
    });
    expect(list.items).toHaveLength(0);
  });

  it("a user cannot attach their transaction to another user's account or category", async () => {
    await expect(transactions.createTransaction(bob.user.id, { ...input(bob), accountId: alice.account.id })).rejects.toBeInstanceOf(NotFoundError);
    await expect(transactions.createTransaction(bob.user.id, { ...input(bob), categoryId: alice.food.id })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("bulk delete only removes the caller's own rows", async () => {
    const mine = await transactions.createTransaction(bob.user.id, input(bob));
    const count = await transactions.deleteTransactions(bob.user.id, [mine.id, aliceTxId]);
    expect(count).toBe(1);
    await expect(transactions.getTransaction(alice.user.id, aliceTxId)).resolves.toBeTruthy();
  });

  it("rejects a category whose type doesn't match", async () => {
    await expect(transactions.createTransaction(alice.user.id, { ...input(alice), categoryId: alice.salary.id })).rejects.toMatchObject({
      code: "categoryTypeMismatch",
    });
  });
});

describe("other resources are isolated per user", () => {
  it("accounts and categories", async () => {
    await expect(
      accounts.updateAccount(bob.user.id, alice.account.id, { name: "Hacked", type: "CASH", initialBalance: 0, color: "#000000" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(accounts.deleteAccount(bob.user.id, alice.account.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(accounts.setAccountArchived(bob.user.id, alice.account.id, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      categories.updateCategory(bob.user.id, alice.food.id, { name: "Hacked", type: "EXPENSE", icon: "car", color: "#000000" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(categories.deleteCategory(bob.user.id, alice.food.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await accounts.listAccounts(bob.user.id)).map((a) => a.id)).not.toContain(alice.account.id);
  });

  it("budgets cannot target another user's category or be edited by them", async () => {
    await expect(budgets.upsertBudget(bob.user.id, { categoryId: alice.food.id, amount: 1, alertThreshold: 80 })).rejects.toBeInstanceOf(NotFoundError);
    const b = await budgets.upsertBudget(alice.user.id, { categoryId: null, amount: 5_000_000, alertThreshold: 80 });
    await expect(budgets.updateBudget(bob.user.id, b.id, { categoryId: null, amount: 1, alertThreshold: 80 })).rejects.toBeInstanceOf(NotFoundError);
    await expect(budgets.deleteBudget(bob.user.id, b.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await budgets.listBudgetStatus(bob.user.id, day("2026-10-01"))).toHaveLength(0);
  });

  it("savings goals and contributions", async () => {
    const g = await goals.createGoal(alice.user.id, { name: "Trip", targetAmount: 1_000_000, deadline: null, color: "#000000", icon: "plane" });
    await goals.addContribution(alice.user.id, { goalId: g.id, amount: 100_000, direction: "deposit", date: day("2026-10-01") });
    const contribution = await prisma.goalContribution.findFirstOrThrow({ where: { goalId: g.id } });

    await expect(
      goals.addContribution(bob.user.id, { goalId: g.id, amount: 1, direction: "deposit", date: day("2026-10-01") }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(goals.deleteContribution(bob.user.id, contribution.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(goals.deleteGoal(bob.user.id, g.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await goals.listGoals(bob.user.id)).toHaveLength(0);
  });

  it("recurring rules", async () => {
    await recurring.createRecurring(
      alice.user.id,
      { ...input(alice), frequency: "MONTHLY", interval: 1, startDate: day("2026-10-01"), endDate: null },
      day("2026-10-01"),
    );
    const rule = await prisma.recurringTransaction.findFirstOrThrow({ where: { userId: alice.user.id } });
    await expect(recurring.setRecurringActive(bob.user.id, rule.id, false)).rejects.toBeInstanceOf(NotFoundError);
    await expect(recurring.deleteRecurring(bob.user.id, rule.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await recurring.listRecurring(bob.user.id)).toHaveLength(0);
  });

  it("reports only aggregate the caller's data", async () => {
    const range = { start: day("2026-10-01"), end: day("2026-11-01") };
    expect((await periodTotals(bob.user.id, range)).expense).toBe(0);
    expect(await categoryTotals(bob.user.id, range)).toHaveLength(0);
    expect(await totalBalance(bob.user.id)).toBe(0);
    expect((await periodTotals(alice.user.id, range)).expense).toBe(120_000);
  });
});

describe("server actions use the session user, never client input", () => {
  it("rejects editing another user's transaction through the action", async () => {
    const { updateTransactionAction, deleteTransactionsAction } = await import("@/actions/finance");
    session.user = { id: bob.user.id, email: bob.user.email, name: "Bob", locale: "vi", currency: "VND" };
    const data = { ...input(bob), date: "2026-10-11" };
    expect(await updateTransactionAction({ id: aliceTxId, data })).toEqual({ ok: false, error: "notFound" });
    expect(await deleteTransactionsAction([aliceTxId])).toEqual({ ok: false, error: "notFound" });
    // Smuggled userId fields are ignored by validation.
    const created = await (await import("@/actions/finance")).createTransactionAction({ ...data, userId: alice.user.id });
    expect(created.ok).toBe(true);
    expect(await prisma.transaction.count({ where: { userId: alice.user.id } })).toBe(1);
  });

  it("returns validation errors instead of throwing", async () => {
    const { createTransactionAction } = await import("@/actions/finance");
    session.user = { id: bob.user.id, email: bob.user.email, name: "Bob", locale: "vi", currency: "VND" };
    const res = await createTransactionAction({ ...input(bob), date: "2026-10-11", amount: -1 });
    expect(res).toMatchObject({ ok: false, error: "validation", fieldErrors: { amount: "amountPositive" } });
  });

  it("requires a session", async () => {
    const { createTransactionAction } = await import("@/actions/finance");
    session.user = null;
    await expect(createTransactionAction({})).rejects.toThrow("NEXT_REDIRECT");
  });
});
