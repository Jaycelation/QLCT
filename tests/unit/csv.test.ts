import { describe, expect, it } from "vitest";
import { sanitizeCell, toCsv } from "@/lib/csv";

describe("CSV export", () => {
  it("neutralizes spreadsheet formulas", () => {
    expect(sanitizeCell("=HYPERLINK(\"http://evil\")")).toBe("'=HYPERLINK(\"http://evil\")");
    expect(sanitizeCell("+1")).toBe("'+1");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCell(-5000)).toBe(-5000);
    expect(sanitizeCell("Ăn trưa")).toBe("Ăn trưa");
  });
  it("quotes commas, quotes and newlines and starts with a BOM", () => {
    const csv = toCsv(["a", "b"], [["x,y", 'say "hi"'], ["line\nbreak", 1]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"x,y","say ""hi"""');
    expect(csv).toContain('"line\nbreak",1');
  });
});
