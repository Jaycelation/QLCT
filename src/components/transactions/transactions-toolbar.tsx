"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TransactionFormDialog } from "@/components/forms/transaction-form-dialog";
import type { AccountOption, CategoryOption } from "@/components/shared/types";

export function TransactionsToolbar({
  exportQuery,
  accounts,
  categories,
}: {
  exportQuery: string;
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const t = useTranslations("transactions");
  const tr = useTranslations("reports");
  const [open, setOpen] = useState(false);
  const q = exportQuery ? `&${exportQuery}` : "";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download /> {tr("export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/api/export/transactions?format=csv${q}`} download>
              <FileText /> CSV
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/export/transactions?format=xlsx${q}`} download>
              <FileSpreadsheet /> Excel (.xlsx)
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={() => setOpen(true)}>
        <Plus /> {t("add")}
      </Button>
      <TransactionFormDialog open={open} onOpenChange={setOpen} accounts={accounts} categories={categories} />
    </>
  );
}
