import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/server/auth/current-user";
import { materializeDueRecurring } from "@/server/recurring";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // Recurring rules are materialized lazily whenever the user opens the app.
  await materializeDueRecurring(user.id);
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId: user.id, archived: false },
      select: { id: true, name: true, color: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: user.id, archived: false },
      select: { id: true, name: true, key: true, icon: true, color: true, type: true },
      orderBy: [{ key: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    }),
  ]);
  return (
    <AppShell user={{ name: user.name, email: user.email }} accounts={accounts} categories={categories}>
      {children}
    </AppShell>
  );
}
