import { describe, expect, it } from "vitest";
import { parseDateOnly } from "@/lib/dates";
import { computeBudgetStatus, computeGoalProgress, generateInsights } from "@/lib/finance";

describe("computeBudgetStatus", () => {
  it("is ok below the alert threshold", () => {
    const s = computeBudgetStatus(1_000_000, 500_000, 80, 15, 30);
    expect(s.state).toBe("ok");
    expect(s.usage).toBe(50);
    expect(s.remaining).toBe(500_000);
  });
  it("warns at the threshold and flags overspending", () => {
    expect(computeBudgetStatus(1_000_000, 800_000, 80, 15, 30).state).toBe("warning");
    expect(computeBudgetStatus(1_000_000, 1_000_000, 80, 15, 30).state).toBe("warning");
    const over = computeBudgetStatus(1_000_000, 1_200_000, 80, 15, 30);
    expect(over.state).toBe("exceeded");
    expect(over.remaining).toBe(-200_000);
    expect(over.dailyAllowance).toBe(0);
  });
  it("projects only variable spending forward", () => {
    // 6.5M rent (recurring) + 1.5M variable over 10 of 30 days.
    const s = computeBudgetStatus(15_000_000, 8_000_000, 80, 10, 30, 1_500_000);
    expect(s.projected).toBe(8_000_000 + 150_000 * 20);
  });
  it("splits what is left over the remaining days, today included", () => {
    expect(computeBudgetStatus(3_000_000, 1_000_000, 80, 21, 30).dailyAllowance).toBe(200_000);
  });
});

describe("computeGoalProgress", () => {
  const today = parseDateOnly("2026-10-16")!;
  it("tracks milestones and monthly need", () => {
    const g = computeGoalProgress(40_000_000, 25_000_000, parseDateOnly("2027-03-16")!, today);
    expect(g.progress).toBeCloseTo(62.5);
    expect(g.milestonesReached).toEqual([25, 50]);
    expect(g.nextMilestone).toBe(75);
    expect(g.daysLeft).toBe(151);
    expect(g.monthlyNeeded).toBeGreaterThan(2_900_000);
    expect(g.completed).toBe(false);
  });
  it("caps progress at 100% and marks completion", () => {
    const g = computeGoalProgress(10, 12, null, today);
    expect(g.progress).toBe(100);
    expect(g.completed).toBe(true);
    expect(g.remaining).toBe(0);
    expect(g.monthlyNeeded).toBeNull();
  });
  it("flags overdue goals", () => {
    const g = computeGoalProgress(100, 10, parseDateOnly("2026-10-01")!, today);
    expect(g.overdue).toBe(true);
  });
});

describe("generateInsights", () => {
  const cat = (id: string, amount: number) => ({ categoryId: id, name: id, key: null, color: "#000", icon: "x", amount });
  it("reports no data for an empty period", () => {
    expect(generateInsights({ income: 0, expense: 0, previousIncome: 0, previousExpense: 0, categories: [], previousCategories: [] })).toEqual([
      { kind: "noData" },
    ]);
  });
  it("detects deficits, top category, spikes and budget alerts", () => {
    const kinds = generateInsights({
      income: 10_000_000,
      expense: 12_000_000,
      previousIncome: 10_000_000,
      previousExpense: 8_000_000,
      categories: [cat("food", 6_000_000), cat("fun", 6_000_000)],
      previousCategories: [cat("food", 5_000_000), cat("fun", 1_000_000)],
      budgetsExceeded: 2,
    }).map((i) => i.kind);
    expect(kinds).toEqual(["budgetsExceeded", "negativeCashflow", "topCategory", "expenseChange", "categorySpike"]);
  });
});
