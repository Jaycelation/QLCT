"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createTransactionAction, updateTransactionAction } from "@/actions/finance";
import { PAYMENT_METHODS } from "@/lib/constants";
import { fieldErrors as toFieldErrors, transactionSchema, type FieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/shared/category-icon";
import { localToday } from "@/components/shared/dates-client";
import type { AccountOption, CategoryOption, TransactionLike } from "@/components/shared/types";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import { FormField } from "./form-field";
import { MoneyInput } from "./money-input";

type TxType = "INCOME" | "EXPENSE";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
  categories: CategoryOption[];
  transaction?: TransactionLike | null;
  defaultType?: TxType;
}

export function TransactionFormDialog(props: Props) {
  const t = useTranslations("transactions");
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.transaction ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("subtitle")}</DialogDescription>
        </DialogHeader>
        {/* Remount per open so the form starts from fresh values. */}
        {props.open && <TransactionForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({ onOpenChange, accounts, categories, transaction, defaultType = "EXPENSE" }: Props) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const tp = useTranslations("paymentMethods");
  const tb = useTranslations("budgets");
  const { categoryName, money, pct } = useFormat();
  const { pending, run } = useAction();

  const [type, setType] = useState<TxType>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState<number | null>(transaction?.amount ?? null);
  const [date, setDate] = useState(transaction?.date ?? localToday());
  const [accountId, setAccountId] = useState(transaction?.account.id ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.category.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState(transaction?.paymentMethod ?? "CASH");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const typeCategories = categories.filter((c) => c.type === type);

  function switchType(next: TxType) {
    setType(next);
    if (!categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { type, amount: amount ?? "", date, accountId, categoryId, paymentMethod, note };
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    run(() => (transaction ? updateTransactionAction({ id: transaction.id, data: input }) : createTransactionAction(input)), {
      success: transaction ? t("updated") : t("created"),
      onSuccess: ({ budgetAlerts }) => {
        onOpenChange(false);
        for (const a of budgetAlerts) {
          const name = a.category ? categoryName(a.category) : tb("overall");
          const text =
            a.state === "exceeded"
              ? tb("alertExceeded", { name, amount: money(-a.remaining) })
              : tb("alertWarning", { name, usage: pct(a.usage) });
          (a.state === "exceeded" ? toast.error : toast.warning)(text, { description: tb("alertTitle") });
        }
      },
      onError: setErrors,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup" aria-label={tc("type")}>
        {(["EXPENSE", "INCOME"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={type === v}
            onClick={() => switchType(v)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all",
              type === v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              type === v && (v === "EXPENSE" ? "text-expense" : "text-income"),
            )}
          >
            {v === "EXPENSE" ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
            {tt(v)}
          </button>
        ))}
      </div>

      <FormField id="tx-amount" label={tc("amount")} error={errors.amount}>
        <MoneyInput
          id="tx-amount"
          value={amount}
          onChange={setAmount}
          invalid={!!errors.amount}
          placeholder={t("amountPlaceholder")}
          className="h-11 text-lg"
          autoFocus
        />
      </FormField>

      <FormField id="tx-category" label={t("category")} error={errors.categoryId}>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="tx-category" aria-invalid={!!errors.categoryId || undefined}>
            <SelectValue placeholder={typeCategories.length ? t("category") : t("noCategory")} />
          </SelectTrigger>
          <SelectContent>
            {typeCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <CategoryIcon icon={c.icon} color={c.color} size="sm" className="size-5 rounded-md [&_svg]:size-3" />
                {categoryName(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="tx-date" label={tc("date")} error={errors.date}>
          <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date || undefined} />
        </FormField>
        <FormField id="tx-account" label={t("account")} error={errors.accountId}>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="tx-account" aria-invalid={!!errors.accountId || undefined}>
              <SelectValue placeholder={accounts.length ? t("account") : t("noAccount")} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField id="tx-method" label={t("paymentMethod")} error={errors.paymentMethod}>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger id="tx-method">
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

      <FormField id="tx-note" label={tc("note")} error={errors.note} optional>
        <Textarea id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} maxLength={500} rows={2} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? tc("saving") : tc("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
