import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { formatMonthKey, parseMonthParam, startOfMonth, today } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { getDashboard } from "@/server/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { month } = await searchParams;
  const now = today();
  let selected = parseMonthParam(typeof month === "string" ? month : null, now);
  if (selected > startOfMonth(now)) selected = startOfMonth(now);
  const data = await getDashboard(user.id, selected, now);
  return <DashboardView data={data} userName={user.name} maxMonth={formatMonthKey(now)} />;
}
