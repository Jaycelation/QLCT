"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, MoreHorizontal, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteBudgetAction, saveBudgetAction, updateBudgetAction } from "@/actions/finance";
import { AXIS_PROPS, ChartLegend, ChartTooltip } from "@/components/charts/chart-tooltip";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { BudgetBar, BudgetStatusLabel } from "@/components/shared/budget-bar";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { MonthPicker } from "@/components/shared/month-picker";
import { PageHeader } from "@/components/shared/page-header";
import type { CategoryOption } from "@/components/shared/types";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import { budgetSchema, fieldErrors as toFieldErrors, type FieldErrors } from "@/lib/validation";
import type { BudgetRow } from "@/server/budgets";
import { cn } from "@/lib/utils";

const OVERALL = "__overall__";

export function BudgetsView({
  budgets,
  categories,
  month,
  maxMonth,
}: {
  budgets: BudgetRow[];
  categories: CategoryOption[];
  month: string;
  maxMonth: string;
}) {
  const t = useTranslations("budgets");
  const tc = useTranslations("common");
  const { money, pct, date, categoryName } = useFormat();
  const { pending, run } = useAction();
  const [editing, setEditing] = useState<BudgetRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<BudgetRow | null>(null);
  const isCurrent = month === maxMonth;

  const label = (b: BudgetRow) => (b.category ? categoryName(b.category) : t("overall"));
  const alerts = budgets.filter((b) => b.state !== "ok");
  const categoryBudgets = budgets.filter((b) => b.categoryId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <>
            <MonthPicker month={month} max={maxMonth} />
            <Button onClick={() => setEditing("new")}>
              <Plus /> {t("add")}
            </Button>
          </>
        }
      />

      {alerts.length > 0 && (
        <Card role="status" className="border-warning/40 bg-warning/8 gap-2 px-5 py-4">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="text-warning size-4" /> {t("alertTitle")}
          </p>
          <ul className="text-sm">
            {alerts.map((b) => (
              <li key={b.id}>
                •{" "}
                {b.state === "exceeded"
                  ? t("alertExceeded", { name: label(b), amount: money(-b.remaining) })
                  : t("alertWarning", { name: label(b), usage: pct(b.usage) })}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title={t("empty")} description={t("emptyHint")} action={<Button onClick={() => setEditing("new")}><Plus /> {t("add")}</Button>} />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {budgets.map((b) => (
              <Card key={b.id} className={cn("animate-fade-up gap-4", !b.categoryId && "md:col-span-2 xl:col-span-3")}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {b.category ? (
                        <CategoryIcon icon={b.category.icon} color={b.category.color} />
                      ) : (
                        <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg">
                          <Target className="size-4" />
                        </span>
                      )}
                      <div>
                        <p className="font-medium">{label(b)}</p>
                        <BudgetStatusLabel state={b.state} />
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={tc("actions")}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(b)}>
                          <Pencil /> {tc("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(b)}>
                          <Trash2 /> {tc("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xl font-semibold tabular">{money(b.spent)}</span>
                      <span className="text-muted-foreground text-sm tabular">/ {money(b.limit)}</span>
                    </div>
                    <BudgetBar usage={b.usage} state={b.state} threshold={b.alertThreshold} />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>{t("usage", { usage: pct(b.usage) })}</span>
                      <span className={cn(b.remaining < 0 && "text-expense font-medium")}>
                        {b.remaining >= 0 ? `${t("remaining")}: ${money(b.remaining)}` : t("overBy", { amount: money(-b.remaining) })}
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">{t("projected")}</dt>
                        <dd className={cn("font-medium tabular", b.projected > b.limit && "text-expense")}>{money(b.projected)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{t("dailyAllowance")}</dt>
                        <dd className="font-medium tabular">{money(b.dailyAllowance)}</dd>
                      </div>
                    </dl>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {categoryBudgets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("plannedVsActual")}</CardTitle>
                <CardDescription className="capitalize">{date(month, { month: "long", year: "numeric" })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ChartLegend
                  items={[
                    { label: t("planned"), color: "var(--chart-3)" },
                    { label: t("actual"), color: "var(--chart-4)" },
                  ]}
                />
                <div style={{ height: Math.max(220, categoryBudgets.length * 56) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={categoryBudgets.map((b) => ({ name: label(b), planned: b.limit, actual: b.spent }))}
                      barGap={2}
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={(v: number) => money(v, { compact: true })} {...AXIS_PROPS} />
                      <YAxis type="category" dataKey="name" width={110} {...AXIS_PROPS} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                        content={({ active, payload, label: name }) =>
                          active && payload?.length ? (
                            <ChartTooltip
                              title={String(name)}
                              rows={[
                                { label: t("planned"), value: money(payload[0].payload.planned), color: "var(--chart-3)" },
                                { label: t("actual"), value: money(payload[0].payload.actual), color: "var(--chart-4)" },
                              ]}
                            />
                          ) : null
                        }
                      />
                      <Bar dataKey="planned" fill="var(--chart-3)" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
                      <Bar dataKey="actual" fill="var(--chart-4)" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("addTitle") : t("editTitle")}</DialogTitle>
            <DialogDescription>{t("replaceHint")}</DialogDescription>
          </DialogHeader>
          {editing && <BudgetForm budget={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("deleteTitle")}
        pending={pending}
        onConfirm={() => deleting && run(() => deleteBudgetAction(deleting.id), { success: t("deleted"), onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}

function BudgetForm({ budget, categories, onClose }: { budget: BudgetRow | null; categories: CategoryOption[]; onClose: () => void }) {
  const t = useTranslations("budgets");
  const tc = useTranslations("common");
  const { categoryName } = useFormat();
  const { pending, run } = useAction();
  const [scope, setScope] = useState(budget ? (budget.categoryId ?? OVERALL) : OVERALL);
  const [amount, setAmount] = useState<number | null>(budget?.limit ?? null);
  const [threshold, setThreshold] = useState(String(budget?.alertThreshold ?? 80));
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { categoryId: scope === OVERALL ? null : scope, amount: amount ?? "", alertThreshold: threshold };
    const parsed = budgetSchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    run(() => (budget ? updateBudgetAction({ id: budget.id, data: input }) : saveBudgetAction(input)), {
      success: t("saved"),
      onSuccess: onClose,
      onError: setErrors,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormField id="b-scope" label={t("scope")} error={errors.categoryId}>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger id="b-scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OVERALL}>{t("overall")}</SelectItem>
            <SelectSeparator />
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {categoryName(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="b-amount" label={t("limit")} error={errors.amount}>
        <MoneyInput id="b-amount" value={amount} onChange={setAmount} invalid={!!errors.amount} autoFocus />
      </FormField>
      <FormField id="b-threshold" label={t("alertThreshold")} error={errors.alertThreshold}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={Number(threshold) || 80}
            onChange={(e) => setThreshold(e.target.value)}
            className="accent-primary flex-1 cursor-pointer"
            aria-label={t("alertThreshold")}
          />
          <div className="relative w-20">
            <Input id="b-threshold" type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="pr-7" />
            <span className="text-muted-foreground absolute inset-y-0 right-2.5 flex items-center text-sm">%</span>
          </div>
        </div>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {tc("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
