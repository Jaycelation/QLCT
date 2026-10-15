import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { prisma } from "@/lib/db";
import { formatDateOnly } from "@/lib/dates";
import { transactionFilterSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth/current-user";
import { listTransactions } from "@/server/transactions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("transactions");
  return { title: t("title") };
}

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const user = await requireUser();
  const t = await getTranslations("transactions");
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const filter = transactionFilterSchema.parse(flat);

  const [result, accounts, categories] = await Promise.all([
    listTransactions(user.id, filter),
    prisma.account.findMany({ where: { userId: user.id }, select: { id: true, name: true, color: true, type: true, archived: true }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, key: true, icon: true, color: true, type: true, archived: true },
      orderBy: [{ type: "asc" }, { key: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    }),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries({
      q: filter.q,
      type: filter.type,
      categoryId: filter.categoryId,
      accountId: filter.accountId,
      paymentMethod: filter.paymentMethod,
      from: filter.from ? formatDateOnly(filter.from) : undefined,
      to: filter.to ? formatDateOnly(filter.to) : undefined,
    }).filter((e): e is [string, string] => !!e[1]),
  ).toString();

  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeCategories = categories.filter((c) => !c.archived);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={<TransactionsToolbar exportQuery={exportQuery} accounts={activeAccounts} categories={activeCategories} />}
      />
      <TransactionFilters accounts={accounts} categories={categories} />
      <TransactionTable
        result={result}
        accounts={activeAccounts}
        categories={activeCategories}
        filtered={Object.keys(flat).some((k) => !["page", "pageSize", "sort"].includes(k) && flat[k])}
      />
    </div>
  );
}
