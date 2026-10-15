import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountsView } from "@/components/accounts/accounts-view";
import { requireUser } from "@/server/auth/current-user";
import { listAccounts } from "@/server/accounts";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accounts");
  return { title: t("title") };
}

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.id, { includeArchived: true });
  return <AccountsView accounts={accounts} />;
}
