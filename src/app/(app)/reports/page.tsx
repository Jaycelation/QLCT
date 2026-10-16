import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportsView } from "@/components/reports/reports-view";
import { formatDateOnly, today } from "@/lib/dates";
import { parseReportParams } from "@/lib/report-params";
import { requireUser } from "@/server/auth/current-user";
import { getReport } from "@/server/report";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await requireUser();
  const now = today();
  const { period, anchor } = parseReportParams(await searchParams, now);
  const report = await getReport(user.id, period, anchor, now);
  return <ReportsView report={report} today={formatDateOnly(now)} />;
}
