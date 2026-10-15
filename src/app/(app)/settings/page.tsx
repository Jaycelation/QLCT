import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsView } from "@/components/settings/settings-view";
import { requireUser } from "@/server/auth/current-user";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const user = await requireUser();
  return <SettingsView user={{ name: user.name, email: user.email, currency: user.currency }} />;
}
