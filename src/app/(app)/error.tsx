"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const tc = useTranslations("common");
  useEffect(() => {
    // Only the digest is logged; server error details are never sent to the browser in production.
    console.error("Page error", error.digest ?? "");
  }, [error]);
  return (
    <Card className="mx-auto mt-10 max-w-md items-center gap-4 px-6 py-10 text-center">
      <span className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("pageTitle")}</h2>
        <p className="text-muted-foreground text-sm">{t("pageDescription")}</p>
      </div>
      <Button onClick={reset}>
        <RotateCcw /> {tc("retry")}
      </Button>
    </Card>
  );
}
