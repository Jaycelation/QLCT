"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { BudgetState } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const BUDGET_STYLES: Record<BudgetState, { bar: string; text: string; icon: typeof CheckCircle2 }> = {
  ok: { bar: "bg-income", text: "text-income", icon: CheckCircle2 },
  warning: { bar: "bg-warning", text: "text-warning-foreground dark:text-warning", icon: AlertTriangle },
  exceeded: { bar: "bg-expense", text: "text-expense", icon: XCircle },
};

/** Status is shown with icon + label + bar color, never color alone. */
export function BudgetStatusLabel({ state, className }: { state: BudgetState; className?: string }) {
  const t = useTranslations("budgets");
  const s = BUDGET_STYLES[state];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", s.text, className)}>
      <s.icon className="size-3.5" />
      {t(state)}
    </span>
  );
}

export function BudgetBar({ usage, state, threshold, className }: { usage: number; state: BudgetState; threshold?: number; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Progress value={usage} className="bg-muted h-2.5" indicatorClassName={BUDGET_STYLES[state].bar} aria-valuetext={`${Math.round(usage)}%`} />
      {threshold !== undefined && threshold < 100 && (
        <span className="bg-foreground/30 absolute top-[-3px] h-[16px] w-0.5 rounded-full" style={{ left: `${threshold}%` }} aria-hidden />
      )}
    </div>
  );
}
