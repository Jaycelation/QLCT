"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Receipt, Repeat, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteTransactionsAction } from "@/actions/finance";
import { TransactionFormDialog } from "@/components/forms/transaction-form-dialog";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import type { AccountOption, CategoryOption } from "@/components/shared/types";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import type { TransactionRow } from "@/server/transactions";
import { cn } from "@/lib/utils";
import { useQueryState } from "./use-query-state";

interface Result {
  items: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: { income: number; expense: number; net: number };
}

export function TransactionTable({
  result,
  accounts,
  categories,
  filtered,
}: {
  result: Result;
  accounts: AccountOption[];
  categories: CategoryOption[];
  filtered: boolean;
}) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const tp = useTranslations("paymentMethods");
  const { money, date, categoryName } = useFormat();
  const { update, pending: navigating } = useQueryState();
  const { pending, run } = useAction();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState<string[] | null>(null);

  const allSelected = result.items.length > 0 && result.items.every((i) => selected.has(i.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function confirmDelete() {
    if (!deleting) return;
    const ids = deleting;
    run(() => deleteTransactionsAction(ids), {
      success: t("deleted", { count: ids.length }),
      onSuccess: () => {
        setDeleting(null);
        setSelected(new Set());
      },
    });
  }

  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.page * result.pageSize, result.total);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        <Summary label={t("totalIncome")} value={money(result.totals.income)} className="text-income" />
        <Summary label={t("totalExpense")} value={money(result.totals.expense)} className="text-expense" />
        <Summary label={t("net")} value={money(result.totals.net, { signed: true })} className={result.totals.net >= 0 ? "text-income" : "text-expense"} />
      </div>

      <Card className={cn("gap-0 overflow-hidden py-0 transition-opacity", navigating && "opacity-60")}>
        {selected.size > 0 && (
          <div className="bg-muted/60 flex items-center justify-between border-b px-4 py-2 text-sm">
            <span>{t("count", { count: selected.size })}</span>
            <Button variant="destructive" size="sm" onClick={() => setDeleting([...selected])}>
              <Trash2 /> {t("deleteSelected", { count: selected.size })}
            </Button>
          </div>
        )}

        {result.items.length === 0 ? (
          <EmptyState icon={Receipt} title={filtered ? t("emptyFiltered") : t("empty")} description={filtered ? undefined : t("emptyHint")} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
                        onCheckedChange={(v) => setSelected(v ? new Set(result.items.map((i) => i.id)) : new Set())}
                        aria-label={t("selectAll")}
                      />
                    </TableHead>
                    <TableHead>{tc("date")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{tc("note")}</TableHead>
                    <TableHead>{t("account")}</TableHead>
                    <TableHead>{t("paymentMethod")}</TableHead>
                    <TableHead className="text-right">{tc("amount")}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((tx) => (
                    <TableRow key={tx.id} data-state={selected.has(tx.id) ? "selected" : undefined}>
                      <TableCell className="pl-4">
                        <Checkbox checked={selected.has(tx.id)} onCheckedChange={() => toggle(tx.id)} aria-label={t("select")} />
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular">{date(tx.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <CategoryIcon icon={tx.category.icon} color={tx.category.color} size="sm" />
                          <span className="font-medium">{categoryName(tx.category)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{tx.note || <span className="text-muted-foreground">—</span>}</span>
                          {tx.recurringId && (
                            <Badge variant="secondary" className="shrink-0">
                              <Repeat /> {t("recurring")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: tx.account.color }} />
                          {tx.account.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{tp(tx.paymentMethod)}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular", tx.type === "INCOME" ? "text-income" : "text-expense")}>
                        {money(tx.type === "INCOME" ? tx.amount : -tx.amount, { signed: true })}
                      </TableCell>
                      <TableCell>
                        <RowMenu onEdit={() => setEditing(tx)} onDelete={() => setDeleting([tx.id])} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y md:hidden">
              {result.items.map((tx) => (
                <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <CategoryIcon icon={tx.category.icon} color={tx.category.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.note || categoryName(tx.category)}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {categoryName(tx.category)} · {tx.account.name} · {date(tx.date)}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular", tx.type === "INCOME" ? "text-income" : "text-expense")}>
                    {money(tx.type === "INCOME" ? tx.amount : -tx.amount, { signed: true })}
                  </span>
                  <RowMenu onEdit={() => setEditing(tx)} onDelete={() => setDeleting([tx.id])} />
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">{tc("showing", { from, to, total: result.total })}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground hidden sm:inline">{tc("pageOf", { page: result.page, total: result.pageCount })}</span>
                <Button variant="outline" size="icon-sm" disabled={result.page <= 1} onClick={() => update({ page: String(result.page - 1) }, false)} aria-label={tc("previous")}>
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon-sm" disabled={result.page >= result.pageCount} onClick={() => update({ page: String(result.page + 1) }, false)} aria-label={tc("next")}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <TransactionFormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} accounts={accounts} categories={categories} transaction={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting && deleting.length > 1 ? t("deleteSelectedTitle", { count: deleting.length }) : t("deleteTitle")}
        onConfirm={confirmDelete}
        pending={pending}
      />
    </>
  );
}

function Summary({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card className="flex-row items-center justify-between gap-1 px-4 py-2.5 sm:flex-col sm:items-start sm:py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("truncate text-base font-semibold tabular sm:text-lg", className)}>{value}</p>
    </Card>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const tc = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={tc("actions")}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> {tc("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 /> {tc("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
