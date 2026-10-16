import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { sanitizeCell } from "@/lib/csv";
import { parseDateOnly, today } from "@/lib/dates";
import { parseReportParams } from "@/lib/report-params";
import { getCurrentUser } from "@/server/auth/current-user";
import { addTransactionsSheet, styleHeader } from "@/server/export/transactions";
import { getReport } from "@/server/report";
import { listAllTransactions } from "@/server/transactions";

const MONEY = '#,##0" ₫";[Red]-#,##0" ₫"';

/** Multi-sheet Excel report: summary, category breakdown, trend and the period's transactions. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const now = today();
  const { period, anchor } = parseReportParams(Object.fromEntries(new URL(request.url).searchParams), now);
  const report = await getReport(user.id, period, anchor, now);
  const transactions = await listAllTransactions(user.id, {
    from: parseDateOnly(report.start)!,
    to: parseDateOnly(report.end)!,
    sort: "date_asc",
  });
  const t = await getTranslations();
  const catName = (c: { name: string; key: string | null }) =>
    c.key && t.has(`categories.${c.key}`) ? t(`categories.${c.key}`) : c.name;

  const wb = new ExcelJS.Workbook();
  wb.creator = "QLCT";
  wb.created = new Date();

  const summary = wb.addWorksheet(t("reports.title"));
  summary.columns = [{ width: 30 }, { width: 22 }, { width: 22 }];
  summary.addRow([t("reports.title")]).font = { bold: true, size: 14 };
  summary.addRow([`${t(`reports.${period}`)}: ${report.start} → ${report.end}`]);
  summary.addRow([]);
  const head = summary.addRow(["", t("reports.current"), t("reports.previous")]);
  head.font = { bold: true };
  const rows: [string, number, number][] = [
    [t("reports.income"), report.totals.income, report.prevTotals.income],
    [t("reports.expense"), report.totals.expense, report.prevTotals.expense],
    [t("reports.net"), report.totals.net, report.prevTotals.net],
  ];
  for (const r of rows) summary.addRow(r).eachCell((c, i) => i > 1 && (c.numFmt = MONEY));
  summary.addRow([t("reports.avgDailyExpense"), report.avgDailyExpense]).getCell(2).numFmt = MONEY;
  summary.addRow([t("reports.savingsRate"), report.totals.income > 0 ? report.savingsRate / 100 : null]).getCell(2).numFmt = "0.0%";
  summary.addRow([t("reports.transactionCount"), report.totals.count]);

  const cats = wb.addWorksheet(t("reports.categoryBreakdown"));
  cats.columns = [
    { header: t("reports.category"), width: 24 },
    { header: t("common.amount"), width: 18 },
    { header: t("reports.share"), width: 12 },
    { header: t("reports.previous"), width: 18 },
  ];
  for (const c of report.expenseCategories) {
    cats.addRow([sanitizeCell(catName(c)), c.amount, report.totals.expense ? c.amount / report.totals.expense : 0, c.previous]);
  }
  cats.getColumn(2).numFmt = MONEY;
  cats.getColumn(3).numFmt = "0.0%";
  cats.getColumn(4).numFmt = MONEY;
  styleHeader(cats);

  const trend = wb.addWorksheet(t("reports.trend"));
  trend.columns = [
    { header: t("common.date"), width: 14 },
    { header: t("reports.income"), width: 18 },
    { header: t("reports.expense"), width: 18 },
    { header: t("reports.net"), width: 18 },
  ];
  for (const p of report.series) trend.addRow([p.key, p.income, p.expense, p.net]);
  [2, 3, 4].forEach((i) => (trend.getColumn(i).numFmt = MONEY));
  styleHeader(trend);

  await addTransactionsSheet(wb, t("transactions.title"), transactions);

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bao-cao-${period}-${report.start}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
