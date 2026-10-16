/** Pure business rules shared by server and client. No I/O here, so it is easy to unit-test. */
import { daysBetween } from "./dates";
import { percent, percentChange } from "./money";

export type BudgetState = "ok" | "warning" | "exceeded";

export interface BudgetStatus {
  limit: number;
  spent: number;
  remaining: number;
  /** Spent as a percentage of the limit (can exceed 100). */
  usage: number;
  state: BudgetState;
  /**
   * Projected month-end spending: what's already spent plus the variable (non-recurring) daily pace
   * for the remaining days. Fixed bills like rent are counted once instead of being extrapolated.
   */
  projected: number;
  /** Amount per remaining day that keeps spending within the limit (0 when already over). */
  dailyAllowance: number;
}

/**
 * @param elapsedDays days of the month that have passed including today (1..daysInMonth)
 * @param variableSpent part of `spent` that did not come from recurring rules (defaults to all of it)
 */
export function computeBudgetStatus(
  limit: number,
  spent: number,
  alertThreshold: number,
  elapsedDays: number,
  daysInMonth: number,
  variableSpent = spent,
): BudgetStatus {
  const usage = percent(spent, limit);
  const state: BudgetState = spent > limit ? "exceeded" : usage >= alertThreshold ? "warning" : "ok";
  const safeElapsed = Math.min(Math.max(elapsedDays, 1), daysInMonth);
  const remainingDays = daysInMonth - safeElapsed + 1;
  const remaining = limit - spent;
  return {
    limit,
    spent,
    remaining,
    usage,
    state,
    projected: Math.round(spent + (variableSpent / safeElapsed) * (daysInMonth - safeElapsed)),
    dailyAllowance: remaining > 0 ? Math.floor(remaining / remainingDays) : 0,
  };
}

export const GOAL_MILESTONES = [25, 50, 75, 100] as const;

export interface GoalProgress {
  saved: number;
  target: number;
  remaining: number;
  progress: number;
  milestonesReached: number[];
  nextMilestone: number | null;
  daysLeft: number | null;
  overdue: boolean;
  /** Monthly saving needed to hit the target by the deadline; null without a deadline. */
  monthlyNeeded: number | null;
  completed: boolean;
}

export function computeGoalProgress(target: number, saved: number, deadline: Date | null, today: Date): GoalProgress {
  const progress = Math.min(percent(saved, target), 100);
  const remaining = Math.max(target - saved, 0);
  const milestonesReached = GOAL_MILESTONES.filter((m) => progress >= m);
  const nextMilestone = GOAL_MILESTONES.find((m) => progress < m) ?? null;
  const completed = saved >= target;
  let daysLeft: number | null = null;
  let monthlyNeeded: number | null = null;
  let overdue = false;
  if (deadline) {
    daysLeft = daysBetween(today, deadline);
    overdue = daysLeft < 0 && !completed;
    if (!completed) {
      const monthsLeft = Math.max(daysLeft / 30.4375, 1);
      monthlyNeeded = Math.ceil(remaining / monthsLeft);
    }
  }
  return { saved, target, remaining, progress, milestonesReached, nextMilestone, daysLeft, overdue, monthlyNeeded, completed };
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  key: string | null;
  color: string;
  icon: string;
  amount: number;
}

export type Insight =
  | { kind: "topCategory"; category: string; categoryKey: string | null; share: number; amount: number }
  | { kind: "expenseChange"; change: number }
  | { kind: "incomeChange"; change: number }
  | { kind: "savingsRate"; rate: number }
  | { kind: "negativeCashflow"; deficit: number }
  | { kind: "categorySpike"; category: string; categoryKey: string | null; change: number; amount: number }
  | { kind: "budgetsExceeded"; count: number }
  | { kind: "budgetsWarning"; count: number }
  | { kind: "noData" };

export interface InsightInput {
  income: number;
  expense: number;
  previousIncome: number;
  previousExpense: number;
  categories: CategoryTotal[];
  previousCategories: CategoryTotal[];
  budgetsExceeded?: number;
  budgetsWarning?: number;
}

/** Turns period totals into a short ranked list of observations. Copy is localized by the UI. */
export function generateInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];
  if (input.income === 0 && input.expense === 0) return [{ kind: "noData" }];

  if (input.budgetsExceeded) insights.push({ kind: "budgetsExceeded", count: input.budgetsExceeded });

  if (input.expense > input.income && input.income > 0) {
    insights.push({ kind: "negativeCashflow", deficit: input.expense - input.income });
  } else if (input.income > 0) {
    insights.push({ kind: "savingsRate", rate: percent(input.income - input.expense, input.income) });
  }

  const sorted = [...input.categories].sort((a, b) => b.amount - a.amount);
  if (sorted[0] && input.expense > 0) {
    insights.push({
      kind: "topCategory",
      category: sorted[0].name,
      categoryKey: sorted[0].key,
      share: percent(sorted[0].amount, input.expense),
      amount: sorted[0].amount,
    });
  }

  const expenseChange = percentChange(input.expense, input.previousExpense);
  if (expenseChange !== null && Math.abs(expenseChange) >= 5) insights.push({ kind: "expenseChange", change: expenseChange });

  const incomeChange = percentChange(input.income, input.previousIncome);
  if (incomeChange !== null && Math.abs(incomeChange) >= 5) insights.push({ kind: "incomeChange", change: incomeChange });

  // Biggest category increase that matters (>= 25% and at least 5% of spending).
  let spike: Insight | null = null;
  let spikeChange = 0;
  for (const c of sorted) {
    const prev = input.previousCategories.find((p) => p.categoryId === c.categoryId)?.amount ?? 0;
    const change = percentChange(c.amount, prev);
    if (change !== null && change >= 25 && c.amount >= input.expense * 0.05 && change > spikeChange) {
      spikeChange = change;
      spike = { kind: "categorySpike", category: c.name, categoryKey: c.key, change, amount: c.amount };
    }
  }
  if (spike) insights.push(spike);

  if (input.budgetsWarning) insights.push({ kind: "budgetsWarning", count: input.budgetsWarning });
  return insights;
}
