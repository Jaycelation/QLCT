"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Banknote, CreditCard, Landmark, Loader2, MoreHorizontal, Pencil, PiggyBank, Plus, Smartphone, Trash2, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { archiveAccountAction, createAccountAction, deleteAccountAction, updateAccountAction } from "@/actions/finance";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { ColorPicker } from "@/components/forms/pickers";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import { ACCOUNT_TYPES, COLOR_SWATCHES } from "@/lib/constants";
import { accountSchema, fieldErrors as toFieldErrors, type FieldErrors } from "@/lib/validation";
import type { AccountWithBalance } from "@/server/accounts";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  CASH: Banknote,
  BANK: Landmark,
  E_WALLET: Smartphone,
  CREDIT_CARD: CreditCard,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  OTHER: Wallet,
} as Record<string, typeof Wallet>;

export function AccountsView({ accounts }: { accounts: AccountWithBalance[] }) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const ta = useTranslations("accountTypes");
  const { money } = useFormat();
  const { pending, run } = useAction();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<AccountWithBalance | "new" | null>(null);
  const [deleting, setDeleting] = useState<AccountWithBalance | null>(null);

  const visible = accounts.filter((a) => showArchived || !a.archived);
  const total = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);

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
      <Card className="from-primary/10 bg-gradient-to-br to-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">{t("totalBalance")}</p>
            <p className={cn("text-3xl font-semibold tracking-tight tabular", total < 0 && "text-expense")}>{money(total)}</p>
          </div>
          {accounts.some((a) => a.archived) && (
            <div className="flex items-center gap-2">
              <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="show-archived">{tc("showArchived")}</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title={t("empty")} action={<Button onClick={() => setEditing("new")}><Plus /> {t("add")}</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((a) => {
            const Icon = TYPE_ICONS[a.type] ?? Wallet;
            return (
              <Card key={a.id} className={cn("animate-fade-up gap-4 overflow-hidden", a.archived && "opacity-60")}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${a.color}22`, color: a.color }}>
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-muted-foreground text-xs">{ta(a.type)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.archived && <Badge variant="secondary">{tc("archived")}</Badge>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={tc("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(a)}>
                            <Pencil /> {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              run(() => archiveAccountAction({ id: a.id, archived: !a.archived }), {
                                success: a.archived ? t("restoredToast") : t("archivedToast"),
                              })
                            }
                          >
                            {a.archived ? <ArchiveRestore /> : <Archive />} {a.archived ? tc("unarchive") : tc("archive")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(a)}>
                            <Trash2 /> {tc("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t("balance")}</p>
                    <p className={cn("text-2xl font-semibold tabular", a.balance < 0 && "text-expense")}>{money(a.balance)}</p>
                  </div>
                  <p className="text-muted-foreground text-xs">{t("transactions", { count: a.transactionCount })}</p>
                </CardContent>
                <div className="h-1" style={{ backgroundColor: a.color }} />
              </Card>
            );
          })}
        </div>
      )}

      <AccountDialog account={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("deleteTitle")}
        pending={pending}
        onConfirm={() => deleting && run(() => deleteAccountAction(deleting.id), { success: t("deleted"), onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}

function AccountDialog({ account, onClose }: { account: AccountWithBalance | "new" | null; onClose: () => void }) {
  const t = useTranslations("accounts");
  return (
    <Dialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account === "new" ? t("addTitle") : t("editTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("subtitle")}</DialogDescription>
        </DialogHeader>
        {account && <AccountForm account={account === "new" ? null : account} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({ account, onClose }: { account: AccountWithBalance | null; onClose: () => void }) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const ta = useTranslations("accountTypes");
  const { pending, run } = useAction();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState(account?.type ?? "BANK");
  const [initialBalance, setInitialBalance] = useState<number | null>(account?.initialBalance ?? 0);
  const [color, setColor] = useState(account?.color ?? COLOR_SWATCHES[9]);
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { name, type, initialBalance: initialBalance ?? 0, color };
    const parsed = accountSchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    run(() => (account ? updateAccountAction({ id: account.id, data: input }) : createAccountAction(input)), {
      success: account ? t("updated") : t("created"),
      onSuccess: onClose,
      onError: setErrors,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormField id="acc-name" label={tc("name")} error={errors.name}>
        <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-invalid={!!errors.name || undefined} autoFocus />
      </FormField>
      <FormField id="acc-type" label={tc("type")} error={errors.type}>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="acc-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((v) => (
              <SelectItem key={v} value={v}>
                {ta(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="acc-balance" label={t("initialBalance")} error={errors.initialBalance} hint={t("initialBalanceHint")}>
        <MoneyInput id="acc-balance" value={initialBalance} onChange={setInitialBalance} allowNegative invalid={!!errors.initialBalance} />
      </FormField>
      <FormField id="acc-color" label={tc("color")}>
        <ColorPicker value={color} onChange={setColor} label={tc("color")} />
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
