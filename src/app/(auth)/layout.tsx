import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BarChart3, CheckCircle2, PiggyBank, Target, Wallet2 } from "lucide-react";
import { LanguageToggle, ThemeToggle } from "@/components/layout/preferences-menu";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const t = await getTranslations();
  const features = [
    { icon: Wallet2, label: t("auth.feature1") },
    { icon: Target, label: t("auth.feature2") },
    { icon: BarChart3, label: t("auth.feature3") },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <Wallet2 className="size-5" />
          </span>
          {t("common.appName")}
        </div>
        <div className="relative my-auto max-w-md space-y-6">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">{t("auth.tagline")}</h1>
          <p className="text-lg text-white/80">{t("auth.taglineSub")}</p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-200" />
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <PiggyBank className="mb-3 size-5 text-emerald-200" />
              <div className="h-2 rounded-full bg-white/20">
                <div className="h-2 w-3/4 rounded-full bg-emerald-200" />
              </div>
              <p className="mt-2 text-sm text-white/80">75%</p>
            </div>
            <div className="flex items-end gap-1.5 rounded-xl bg-white/10 p-4 backdrop-blur">
              {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-white/40" style={{ height: `${h * 0.7}px` }} />
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="flex flex-col">
        <div className="flex justify-end gap-1 p-4">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="animate-fade-up w-full max-w-sm">{children}</div>
        </div>
      </section>
    </div>
  );
}
