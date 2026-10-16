"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarClock, Info, Loader2, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createRecurringAction, deleteRecurringAction, toggleRecurringAction, updateRecurringAction } from "@/actions/finance";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { localToday } from "@/components/shared/dates-client";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import type { AccountOption, CategoryOption } from "@/components/shared/types";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import { FREQUENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { fieldErrors as toFieldErrors, recurringSchema, type FieldErrors } from "@/lib/validation";
import type { RecurringRow } from "@/server/recurring";
import { cn } from "@/lib/utils";

interface Props {
  rules: RecurringRow[];
  accounts: AccountOption[];
  categories: CategoryOption[];
}

export function RecurringView({ rules, accounts, categories }: Props) {
  const t = useTranslations("recurring");
  const tc = useTranslations("common");
  const tf = useTranslations("frequencies");
  const { money, date, categoryName } = useFormat();
  const { pending, run } = useAction();
  const [editing, setEditing] = useState<RecurringRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<RecurringRow | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> {t("add")}
          </Button>
        }
      />
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Info className="size-4 shrink-0" /> {t("howItWorks")}
      </p>

      {rules.length === 0 ? (
        <Card>
          <EmptyState icon={Repeat} title={t("empty")} description={t("emptyHint")} action={<Button onClick={() => setEditing("new")}><Plus /> {t("add")}</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rules.map((r) => {
            const ended = !r.active && r.endDate !== null && r.nextRunDate > r.endDate;
            return (
              <Card key={r.id} className={cn("animate-fade-up min-w-0 flex-row items-center gap-3 px-4 py-4 sm:gap-4", !r.active && "opacity-70")}>
                <CategoryIcon icon={r.category.icon} color={r.category.color} size="lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{r.note || categoryName(r.category)}</p>
                    <Badge variant={r.active ? "success" : "secondary"}>{r.active ? t("active") : ended ? t("ended") : t("paused")}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {tf(r.frequency, { n: r.interval })} · {categoryName(r.category)} · {r.account.name}
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CalendarClock className="size-3.5 shrink-0" />
                    {r.active ? `${t("nextRun")}: ${date(r.nextRunDate)}` : t("generated", { count: r.generatedCount })}
                    {r.active && ` · ${t("generated", { count: r.generatedCount })}`}
                  </p>
                </div>
                <p className={cn("shrink-0 text-right font-semibold whitespace-nowrap tabular", r.type === "INCOME" ? "text-income" : "text-expense")}>
                  {money(r.type === "INCOME" ? r.amount : -r.amount, { signed: true })}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={tc("actions")}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(r)}>
                      <Pencil /> {tc("edit")}
                    </DropdownMenuItem>
                    {!ended && (
                      <DropdownMenuItem
                        onSelect={() =>
                          run(() => toggleRecurringAction({ id: r.id, active: !r.active }), {
                            success: r.active ? t("pausedToast") : t("resumedToast"),
                          })
                        }
                      >
                        {r.active ? <Pause /> : <Play />} {r.active ? t("pause") : t("resume")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(r)}>
                      <Trash2 /> {tc("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("addTitle") : t("editTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("subtitle")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <RecurringForm rule={editing === "new" ? null : editing} accounts={accounts} categories={categories} onClose={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("deleteTitle")}
        description={t("deleteHint")}
        pending={pending}
        onConfirm={() => deleting && run(() => deleteRecurringAction(deleting.id), { success: t("deleted"), onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}

function RecurringForm({
  rule,
  accounts,
  categories,
  onClose,
}: {
  rule: RecurringRow | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const t = useTranslations("recurring");
  const ttx = useTranslations("transactions");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const tp = useTranslations("paymentMethods");
  const tu = useTranslations("frequencyUnits");
  const { categoryName } = useFormat();
  const { pending, run } = useAction();
  const [v, setV] = useState({
    type: rule?.type ?? ("EXPENSE" as "INCOME" | "EXPENSE"),
    amount: rule?.amount ?? (null as number | null),
    accountId: rule?.accountId ?? accounts[0]?.id ?? "",
    categoryId: rule?.categoryId ?? "",
    paymentMethod: (rule?.paymentMethod ?? "BANK_TRANSFER") as string,
    note: rule?.note ?? "",
    frequency: rule?.frequency ?? "MONTHLY",
    interval: String(rule?.interval ?? 1),
    startDate: rule?.startDate ?? localToday(),
    endDate: rule?.endDate ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { ...v, amount: v.amount ?? "", endDate: v.endDate || undefined };
    const parsed = recurringSchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    run(() => (rule ? updateRecurringAction({ id: rule.id, data: input }) : createRecurringAction(input)), {
      success: rule ? t("updated") : t("created"),
      onSuccess: onClose,
      onError: setErrors,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup" aria-label={tc("type")}>
        {(["EXPENSE", "INCOME"] as const).map((ty) => (
          <button
            key={ty}
            type="button"
            role="radio"
            aria-checked={v.type === ty}
            onClick={() => setV((s) => ({ ...s, type: ty, categoryId: categories.some((c) => c.id === s.categoryId && c.type === ty) ? s.categoryId : "" }))}
            className={cn(
              "cursor-pointer rounded-md py-1.5 text-sm font-medium transition-all",
              v.type === ty ? cn("bg-background shadow-sm", ty === "EXPENSE" ? "text-expense" : "text-income") : "text-muted-foreground",
            )}
          >
            {tt(ty)}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="rec-amount" label={tc("amount")} error={errors.amount}>
          <MoneyInput id="rec-amount" value={v.amount} onChange={(n) => set("amount", n)} invalid={!!errors.amount} />
        </FormField>
        <FormField id="rec-category" label={ttx("category")} error={errors.categoryId}>
          <Select value={v.categoryId} onValueChange={(x) => set("categoryId", x)}>
            <SelectTrigger id="rec-category" aria-invalid={!!errors.categoryId || undefined}>
              <SelectValue placeholder={ttx("category")} />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((c) => c.type === v.type)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {categoryName(c)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="rec-account" label={ttx("account")} error={errors.accountId}>
          <Select value={v.accountId} onValueChange={(x) => set("accountId", x)}>
            <SelectTrigger id="rec-account">
              <SelectValue placeholder={ttx("account")} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="rec-method" label={ttx("paymentMethod")}>
          <Select value={v.paymentMethod} onValueChange={(x) => set("paymentMethod", x)}>
            <SelectTrigger id="rec-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {tp(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="rec-interval" label={t("interval")} error={errors.interval}>
          <div className="flex gap-2">
            <Input id="rec-interval" type="number" min={1} max={365} value={v.interval} onChange={(e) => set("interval", e.target.value)} className="w-20" aria-invalid={!!errors.interval || undefined} />
            <Select value={v.frequency} onValueChange={(x) => set("frequency", x as typeof v.frequency)}>
              <SelectTrigger aria-label={t("frequency")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {tu(f)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormField>
        <FormField id="rec-start" label={t("startDate")} error={errors.startDate}>
          <Input id="rec-start" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} aria-invalid={!!errors.startDate || undefined} />
        </FormField>
        <FormField id="rec-end" label={t("endDate")} error={errors.endDate} optional>
          <Input id="rec-end" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} aria-invalid={!!errors.endDate || undefined} />
        </FormField>
      </div>
      <FormField id="rec-note" label={tc("note")} error={errors.note} optional>
        <Textarea id="rec-note" rows={2} value={v.note} onChange={(e) => set("note", e.target.value)} maxLength={500} />
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
