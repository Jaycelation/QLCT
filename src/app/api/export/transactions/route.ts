import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";
import { formatDateOnly, today } from "@/lib/dates";
import { transactionFilterSchema } from "@/lib/validation";
import { getCurrentUser } from "@/server/auth/current-user";
import { addTransactionsSheet, transactionsCsv } from "@/server/export/transactions";
import { listAllTransactions } from "@/server/transactions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const format = params.format === "xlsx" ? "xlsx" : "csv";
  const filter = transactionFilterSchema.parse(params);
  const rows = await listAllTransactions(user.id, filter);
  const filename = `giao-dich-${formatDateOnly(today())}`;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

  if (format === "csv") {
    return new Response(await transactionsCsv(rows), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"` },
    });
  }

  const t = await getTranslations("transactions");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "QLCT";
  await addTransactionsSheet(workbook, t("title"), rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      ...headers,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
