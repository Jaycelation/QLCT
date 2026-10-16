"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  contributionSchema,
  goalSchema,
  recurringSchema,
  transactionSchema,
} from "@/lib/validation";
import { authedAction } from "@/server/action-utils";
import * as accounts from "@/server/accounts";
import * as budgets from "@/server/budgets";
import * as categories from "@/server/categories";
import * as goals from "@/server/goals";
import * as recurring from "@/server/recurring";
import * as transactions from "@/server/transactions";

// Every action: session check -> Zod validation -> service call scoped by the session's user id.
// Client-supplied ids are only ever used together with that user id, which is what prevents IDOR.

const idSchema = z.string().trim().min(1).max(64);
const withId = <S extends z.ZodType>(schema: S) => z.object({ id: idSchema, data: schema });
const archiveSchema = z.object({ id: idSchema, archived: z.boolean() });
const refresh = () => revalidatePath("/", "layout");

async function done<T>(result: Promise<T>) {
  const r = await result;
  refresh();
  return r;
}

// Transactions
type TransactionData = z.output<typeof transactionSchema>;
/** Saved expenses also report the budgets they pushed to the alert threshold or over the limit. */
const withBudgetAlerts = async (userId: string, d: TransactionData, transaction: transactions.TransactionRow) => ({
  transaction,
  budgetAlerts: d.type === "EXPENSE" ? await budgets.budgetAlertsFor(userId, d.categoryId, d.date) : [],
});

export const createTransactionAction = async (input: unknown) =>
  done(authedAction(transactionSchema, input, async (u, d) => withBudgetAlerts(u.id, d, await transactions.createTransaction(u.id, d))));
export const updateTransactionAction = async (input: unknown) =>
  done(
    authedAction(withId(transactionSchema), input, async (u, d) =>
      withBudgetAlerts(u.id, d.data, await transactions.updateTransaction(u.id, d.id, d.data)),
    ),
  );
export const deleteTransactionsAction = async (input: unknown) =>
  done(authedAction(z.array(idSchema).min(1).max(500), input, (u, ids) => transactions.deleteTransactions(u.id, ids)));

// Accounts
export const createAccountAction = async (input: unknown) =>
  done(authedAction(accountSchema, input, async (u, d) => void (await accounts.createAccount(u.id, d))));
export const updateAccountAction = async (input: unknown) =>
  done(authedAction(withId(accountSchema), input, async (u, d) => void (await accounts.updateAccount(u.id, d.id, d.data))));
export const archiveAccountAction = async (input: unknown) =>
  done(authedAction(archiveSchema, input, (u, d) => accounts.setAccountArchived(u.id, d.id, d.archived)));
export const deleteAccountAction = async (input: unknown) =>
  done(authedAction(idSchema, input, (u, id) => accounts.deleteAccount(u.id, id)));

// Categories
export const createCategoryAction = async (input: unknown) =>
  done(authedAction(categorySchema, input, async (u, d) => void (await categories.createCategory(u.id, d))));
export const updateCategoryAction = async (input: unknown) =>
  done(authedAction(withId(categorySchema), input, async (u, d) => void (await categories.updateCategory(u.id, d.id, d.data))));
export const archiveCategoryAction = async (input: unknown) =>
  done(authedAction(archiveSchema, input, (u, d) => categories.setCategoryArchived(u.id, d.id, d.archived)));
export const deleteCategoryAction = async (input: unknown) =>
  done(authedAction(idSchema, input, (u, id) => categories.deleteCategory(u.id, id)));

// Recurring
export const createRecurringAction = async (input: unknown) =>
  done(authedAction(recurringSchema, input, async (u, d) => void (await recurring.createRecurring(u.id, d))));
export const updateRecurringAction = async (input: unknown) =>
  done(authedAction(withId(recurringSchema), input, (u, d) => recurring.updateRecurring(u.id, d.id, d.data)));
export const toggleRecurringAction = async (input: unknown) =>
  done(
    authedAction(z.object({ id: idSchema, active: z.boolean() }), input, (u, d) =>
      recurring.setRecurringActive(u.id, d.id, d.active),
    ),
  );
export const deleteRecurringAction = async (input: unknown) =>
  done(authedAction(idSchema, input, (u, id) => recurring.deleteRecurring(u.id, id)));

// Budgets
export const saveBudgetAction = async (input: unknown) =>
  done(authedAction(budgetSchema, input, async (u, d) => void (await budgets.upsertBudget(u.id, d))));
export const updateBudgetAction = async (input: unknown) =>
  done(authedAction(withId(budgetSchema), input, async (u, d) => void (await budgets.updateBudget(u.id, d.id, d.data))));
export const deleteBudgetAction = async (input: unknown) =>
  done(authedAction(idSchema, input, (u, id) => budgets.deleteBudget(u.id, id)));

// Savings goals
export const createGoalAction = async (input: unknown) =>
  done(authedAction(goalSchema, input, async (u, d) => void (await goals.createGoal(u.id, d))));
export const updateGoalAction = async (input: unknown) =>
  done(authedAction(withId(goalSchema), input, (u, d) => goals.updateGoal(u.id, d.id, d.data)));
export const archiveGoalAction = async (input: unknown) =>
  done(authedAction(archiveSchema, input, (u, d) => goals.setGoalArchived(u.id, d.id, d.archived)));
export const deleteGoalAction = async (input: unknown) =>
  done(authedAction(idSchema, input, (u, id) => goals.deleteGoal(u.id, id)));
export const addContributionAction = async (input: unknown) =>
  done(authedAction(contributionSchema, input, (u, d) => goals.addContribution(u.id, d)));
export const deleteContributionAction = async (input: unknown) =>
  done(authedAction(idSchema, input, (u, id) => goals.deleteContribution(u.id, id)));
