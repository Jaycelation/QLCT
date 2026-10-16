"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + translated validation message. `error` is a `validation.*` key. */
export function FormField({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const message = error ? (t.has(`validation.${error}`) ? t(`validation.${error}`) : t("validation.invalid")) : null;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="text-muted-foreground text-xs font-normal">({t("common.optional")})</span>}
      </Label>
      {children}
      {message ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {message}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
