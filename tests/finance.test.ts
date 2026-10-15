import { describe, it, expect } from "vitest";
import { nextOccurrence, totals, csvCell, reportRange } from "../lib/finance";
import { transactionSchema, date } from "../lib/validation";
import { checkOrigin, body } from "../lib/http";
describe("money and calendar correctness", () => {
  it("handles month-end without skipping February and restores anchor in March", () => {
    expect(nextOccurrence("2026-01-31", "MONTHLY", 31)).toBe("2026-02-28");
    expect(nextOccurrence("2026-02-28", "MONTHLY", 31)).toBe("2026-03-31");
  });
  it("handles leap years and weekly year rollover", () => {
    expect(nextOccurrence("2024-02-29", "YEARLY", 29)).toBe("2025-02-28");
    expect(nextOccurrence("2026-12-29", "WEEKLY", 29)).toBe("2027-01-05");
  });
  it("rejects invalid dates and fractional VND", () => {
    expect(date.safeParse("2026-02-30").success).toBe(false);
    expect(
      transactionSchema.safeParse({
        accountId: "a",
        categoryId: "b",
        type: "EXPENSE",
        amount: 1.5,
        date: "2026-01-01",
      }).success,
    ).toBe(false);
  });
  it("sums signed cash flow exactly", () => {
    const base = {
      date: "2026-01-01",
      accountId: "a",
      categoryId: "b",
      note: "",
      paymentMethod: "BANK",
    };
    expect(
      totals([
        { ...base, type: "INCOME", amount: 25000000 },
        { ...base, type: "EXPENSE", amount: 3500000 },
      ]),
    ).toEqual({ income: 25000000, expenses: 3500000 });
  });
  it("uses Monday as weekly boundary across years", () =>
    expect(reportRange("week", "2026-01-01")).toEqual({
      from: "2025-12-29",
      to: "2026-01-04",
    }));
  it("escapes CSV quotes and formula injection", () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell("hello,world")).toBe('"hello,world"');
    expect(csvCell("  +42")).toBe('"\'  +42"');
  });
});
describe("request boundaries", () => {
  it("rejects missing and cross-site origins before mutations", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    for (const origin of ["", "https://attacker.example"])
      expect(() =>
        checkOrigin(
          new Request("http://localhost:3000/api/finance", {
            headers: { origin, "Content-Type": "application/json" },
          }),
        ),
      ).toThrow("INVALID_ORIGIN");
    expect(() =>
      checkOrigin(
        new Request("http://localhost:3000/api/finance", {
          headers: {
            origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects oversized request bodies", async () => {
    await expect(
      body(
        new Request("http://localhost", {
          method: "POST",
          body: "a".repeat(17000),
        }),
      ),
    ).rejects.toThrow("BODY_TOO_LARGE");
  });
  it("rejects userId injection", () =>
    expect(
      transactionSchema.safeParse({
        userId: "victim",
        accountId: "a",
        categoryId: "b",
        type: "EXPENSE",
        amount: 100,
        date: "2026-01-01",
      }).success,
    ).toBe(false));
});
