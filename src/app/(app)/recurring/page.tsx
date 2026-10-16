import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RecurringView } from "@/components/recurring/recurring-view";
import { prisma } from "@/lib/db";
import { requireUser } from "@/server/auth/current-user";
import { listRecurring } from "@/server/recurring";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("recurring");
  return { title: t("title") };
}

export default async function RecurringPage() {
  const user = await requireUser();
  const [rules, accounts, categories] = await Promise.all([
    listRecurring(user.id),
    prisma.account.findMany({ where: { userId: user.id, archived: false }, select: { id: true, name: true, color: true, type: true }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({
      where: { userId: user.id, archived: false },
      select: { id: true, name: true, key: true, icon: true, color: true, type: true },
      orderBy: [{ key: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    }),
  ]);
  return <RecurringView rules={rules} accounts={accounts} categories={categories} />;
}
