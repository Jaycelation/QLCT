import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategoriesView } from "@/components/categories/categories-view";
import { requireUser } from "@/server/auth/current-user";
import { listCategories } from "@/server/categories";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("categoriesPage");
  return { title: t("title") };
}

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await listCategories(user.id, { includeArchived: true });
  return (
    <CategoriesView
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        key: c.key,
        type: c.type,
        icon: c.icon,
        color: c.color,
        archived: c.archived,
        used: c._count.transactions,
      }))}
    />
  );
}
