import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BudgetsView } from "@/components/budgets/budgets-view";
import { prisma } from "@/lib/db";
import { formatMonthKey, parseMonthParam, startOfMonth, today } from "@/lib/dates";
import { requireUser } from "@/server/auth/current-user";
import { listBudgetStatus } from "@/server/budgets";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("budgets");
  return { title: t("title") };
}

export default async function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  const user = await requireUser();
  const { month } = await searchParams;
  const now = today();
  let selected = parseMonthParam(typeof month === "string" ? month : null, now);
  if (selected > startOfMonth(now)) selected = startOfMonth(now);
  const [budgets, categories] = await Promise.all([
    listBudgetStatus(user.id, selected, now),
    prisma.category.findMany({
      where: { userId: user.id, type: "EXPENSE", archived: false },
      select: { id: true, name: true, key: true, icon: true, color: true, type: true },
      orderBy: [{ key: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    }),
  ]);
  return <BudgetsView budgets={budgets} categories={categories} month={formatMonthKey(selected)} maxMonth={formatMonthKey(now)} />;
}
