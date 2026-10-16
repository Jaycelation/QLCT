import { describe, expect, it } from "vitest";
import { formatMoney, parseAmountInput, percentChange } from "@/lib/money";

describe("parseAmountInput", () => {
  it.each([
    ["1.500.000", 1_500_000],
    ["1,500,000", 1_500_000],
    ["150000 ₫", 150_000],
    ["200k", 200_000],
    ["1.5tr", 1_500_000],
    ["2,5tr", 2_500_000],
    ["3 tỷ", 3_000_000_000],
    ["  45 000 VND ", 45_000],
  ])("parses %s", (raw, expected) => {
    expect(parseAmountInput(raw)).toBe(expected);
  });

  it.each(["", "abc", "1.2.x", "--"])("rejects %j", (raw) => {
    expect(parseAmountInput(raw)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats VND without decimals in Vietnamese", () => {
    expect(formatMoney(1_500_000).replace(/\s/g, " ")).toBe("1.500.000 ₫");
  });
  it("formats in English", () => {
    expect(formatMoney(1_500_000, { locale: "en" })).toContain("1,500,000");
  });
});

describe("percentChange", () => {
  it("computes relative change", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });
  it("has no baseline when previous is zero", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
  });
});
