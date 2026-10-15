import { describe, expect, it } from "vitest";
import { fieldErrors, recurringSchema, registerSchema, transactionFilterSchema, transactionSchema } from "@/lib/validation";

const tx = { type: "EXPENSE", amount: 50000, date: "2026-10-15", accountId: "a1", categoryId: "c1", paymentMethod: "CASH" };

describe("transactionSchema", () => {
  it("accepts a valid transaction and trims empty notes", () => {
    const r = transactionSchema.parse({ ...tx, note: "  " });
    expect(r.note).toBeUndefined();
    expect(r.date.toISOString()).toBe("2026-10-15T00:00:00.000Z");
  });
  it.each([
    [{ amount: 0 }, "amount", "amountPositive"],
    [{ amount: -5 }, "amount", "amountPositive"],
    [{ amount: 1.5 }, "amount", "invalidAmount"],
    [{ amount: 1e15 }, "amount", "amountTooLarge"],
    [{ amount: 1e20 }, "amount", "invalidAmount"],
    [{ date: "2026-02-30" }, "date", "invalidDate"],
    [{ categoryId: "" }, "categoryId", "required"],
    [{ note: "x".repeat(501) }, "note", "tooLong"],
  ])("rejects %j", (patch, field, key) => {
    const r = transactionSchema.safeParse({ ...tx, ...patch });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)[field]).toBe(key);
  });
  it("rejects unknown types and payment methods", () => {
    expect(transactionSchema.safeParse({ ...tx, type: "TRANSFER" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...tx, paymentMethod: "BITCOIN" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalizes email and requires a reasonable password", () => {
    expect(registerSchema.parse({ name: "An", email: " An@Example.COM ", password: "abc12345" }).email).toBe("an@example.com");
    expect(registerSchema.safeParse({ name: "An", email: "a@b.co", password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "An", email: "a@b.co", password: "onlyletters" }).success).toBe(false);
  });
});

describe("transactionFilterSchema", () => {
  it("falls back to safe defaults for junk query params", () => {
    const f = transactionFilterSchema.parse({ page: "-3", pageSize: "100000", sort: "drop table", type: "x", from: "nope" });
    expect(f).toMatchObject({ page: 1, pageSize: 20, sort: "date_desc", type: undefined, from: undefined });
  });
});

describe("recurringSchema", () => {
  it("requires the end date to follow the start date", () => {
    const r = recurringSchema.safeParse({ ...tx, frequency: "MONTHLY", interval: 1, startDate: "2026-10-10", endDate: "2026-10-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).endDate).toBe("endBeforeStart");
  });
});
