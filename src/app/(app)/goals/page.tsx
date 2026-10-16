import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoalsView } from "@/components/goals/goals-view";
import { requireUser } from "@/server/auth/current-user";
import { listGoals } from "@/server/goals";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("goals");
  return { title: t("title") };
}

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);
  return <GoalsView goals={goals} />;
}
