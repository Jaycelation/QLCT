"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_METHODS } from "@/lib/constants";
import { useFormat } from "@/components/shared/use-format";
import { useQueryState } from "./use-query-state";

interface Props {
  accounts: { id: string; name: string; color: string }[];
  categories: { id: string; name: string; key: string | null; type: "INCOME" | "EXPENSE"; color: string }[];
}

export function TransactionFilters({ accounts, categories }: Props) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const tp = useTranslations("paymentMethods");
  const { categoryName } = useFormat();
  const { params, update, pending, clear } = useQueryState();
  const [q, setQ] = useState(params.get("q") ?? "");

  // Debounce free-text search.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => update({ q }), 350);
    return () => clearTimeout(id);
  }, [q, params, update]);

  const value = (k: string) => params.get(k) ?? "all";
  const hasFilters = ["q", "type", "categoryId", "accountId", "paymentMethod", "from", "to"].some((k) => params.get(k));
  const type = params.get("type");

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} className="pl-9" aria-label={tc("search")} maxLength={100} />
          {pending && <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
        </div>
        <Select value={value("sort") === "all" ? "date_desc" : value("sort")} onValueChange={(v) => update({ sort: v === "date_desc" ? null : v })}>
          <SelectTrigger className="md:w-44" aria-label={t("sort")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">{t("sortDateDesc")}</SelectItem>
            <SelectItem value="date_asc">{t("sortDateAsc")}</SelectItem>
            <SelectItem value="amount_desc">{t("sortAmountDesc")}</SelectItem>
            <SelectItem value="amount_asc">{t("sortAmountAsc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Select value={value("type")} onValueChange={(v) => update({ type: v, categoryId: null })}>
          <SelectTrigger aria-label={tc("type")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            <SelectItem value="EXPENSE">{tt("EXPENSE")}</SelectItem>
            <SelectItem value="INCOME">{tt("INCOME")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value("categoryId")} onValueChange={(v) => update({ categoryId: v })}>
          <SelectTrigger aria-label={t("category")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {(["EXPENSE", "INCOME"] as const)
              .filter((ty) => !type || type === ty)
              .map((ty) => (
                <SelectGroup key={ty}>
                  <SelectLabel>{tt(ty)}</SelectLabel>
                  {categories
                    .filter((c) => c.type === ty)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {categoryName(c)}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
          </SelectContent>
        </Select>
        <Select value={value("accountId")} onValueChange={(v) => update({ accountId: v })}>
          <SelectTrigger aria-label={t("account")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allAccounts")}</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={value("paymentMethod")} onValueChange={(v) => update({ paymentMethod: v })}>
          <SelectTrigger aria-label={t("paymentMethod")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allMethods")}</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {tp(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" aria-label={t("from")} title={t("from")} value={params.get("from") ?? ""} onChange={(e) => update({ from: e.target.value })} />
        <Input type="date" aria-label={t("to")} title={t("to")} value={params.get("to") ?? ""} onChange={(e) => update({ to: e.target.value })} />
      </div>
      {hasFilters && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              clear();
            }}
          >
            <X /> {tc("reset")}
          </Button>
        </div>
      )}
    </Card>
  );
}
