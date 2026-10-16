import "server-only";
import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { toCsv, sanitizeCell } from "@/lib/csv";
import type { TransactionRow } from "@/server/transactions";

export async function transactionColumns() {
  const t = await getTranslations();
  return {
    headers: [
      t("common.date"),
      t("common.type"),
      t("transactions.category"),
      t("common.amount"),
      t("transactions.account"),
      t("transactions.paymentMethod"),
      t("common.note"),
    ],
    row: (tx: TransactionRow) => [
      tx.date,
      t(`types.${tx.type}`),
      tx.category.key && t.has(`categories.${tx.category.key}`) ? t(`categories.${tx.category.key}`) : tx.category.name,
      tx.type === "INCOME" ? tx.amount : -tx.amount,
      tx.account.name,
      t(`paymentMethods.${tx.paymentMethod}`),
      tx.note ?? "",
    ],
  };
}

export async function transactionsCsv(rows: TransactionRow[]) {
  const { headers, row } = await transactionColumns();
  return toCsv(headers, rows.map(row));
}

export async function addTransactionsSheet(workbook: ExcelJS.Workbook, name: string, rows: TransactionRow[]) {
  const { headers, row } = await transactionColumns();
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = headers.map((h, i) => ({ header: h, width: [12, 12, 20, 16, 18, 16, 40][i] }));
  for (const tx of rows) sheet.addRow(row(tx).map(sanitizeCell));
  styleHeader(sheet);
  sheet.getColumn(4).numFmt = '#,##0" ₫";[Red]-#,##0" ₫"';
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  return sheet;
}

export function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F9F7A" } };
  header.alignment = { vertical: "middle" };
  header.height = 20;
}
