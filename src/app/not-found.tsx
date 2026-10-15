import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
        <Compass className="size-7" />
      </span>
      <p className="text-muted-foreground text-sm font-semibold tracking-widest">404</p>
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground max-w-sm text-sm">{t("notFoundDescription")}</p>
      <Button asChild>
        <Link href="/dashboard">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
