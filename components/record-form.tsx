"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { copy } from "@/lib/i18n";
import { today } from "@/lib/finance";
import type { FinanceData, Lang } from "@/lib/types";
export type Editor = { resource: string; record?: Record<string, unknown> };
export function RecordForm({
  editor,
  data,
  lang,
  month,
  onClose,
  onSave,
}: {
  editor: Editor;
  data: FinanceData;
  lang: Lang;
  month: string;
  onClose: () => void;
  onSave: (
    resource: string,
    id: string | undefined,
    value: unknown,
  ) => Promise<void>;
}) {
  const t = copy[lang];
  const { resource, record: r = {} } = editor;
  const [type, setType] = useState(String(r.type ?? "EXPENSE"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const transaction = resource === "transactions" || resource === "recurring";
  const title = r.id
    ? t.edit
    : resource === "transactions"
      ? t.add
      : resource === "budgets"
        ? t.newBudget
        : resource === "goals"
          ? t.newGoal
          : resource === "accounts"
            ? t.newAccount
            : resource === "categories"
              ? t.newCategory
              : t.newRecurring;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v: Record<string, unknown> = Object.fromEntries(f);
    for (const key of ["amount", "target", "saved", "openingBalance"])
      if (key in v) v[key] = Number(v[key]);
    if (resource === "budgets") v.categoryId = v.categoryId || null;
    if (resource === "recurring") v.active = f.get("active") === "on";
    setBusy(true);
    setError("");
    try {
      await onSave(resource, r.id as string | undefined, v);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    label: string,
    name: string,
    inputType = "text",
    value: unknown = "",
    extra: Record<string, unknown> = {},
  ) => (
    <label className="field" key={name}>
      <span>{label}</span>
      <input
        name={name}
        type={inputType}
        defaultValue={String(r[name] ?? value)}
        required
        maxLength={inputType === "text" ? 80 : undefined}
        {...extra}
      />
    </label>
  );
  const typeSelect = (
    <label className="field">
      <span>{t.type}</span>
      <select
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="EXPENSE">{t.expenses}</option>
        <option value="INCOME">{t.income}</option>
      </select>
    </label>
  );
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()} title={title}>
      <form onSubmit={submit} className="record-form">
        {(resource === "accounts" ||
          resource === "goals" ||
          resource === "categories") &&
          field(t.name, "name")}
        {(transaction || resource === "categories") && typeSelect}
        {transaction && (
          <>
            <div className="form-grid">
              {field(t.amount + " (VND)", "amount", "number", undefined, {
                min: 1,
                max: 1e12,
                step: 1,
              })}
              {field(
                resource === "recurring" ? t.nextDate : t.date,
                resource === "recurring" ? "nextDate" : "date",
                "date",
                today(),
                resource === "transactions" ? { max: today() } : {},
              )}
            </div>
            <label className="field">
              <span>{t.category}</span>
              <select
                key={type}
                name="categoryId"
                defaultValue={String(r.categoryId ?? "")}
                required
              >
                <option value="" disabled>
                  {t.category}
                </option>
                {data.categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="form-grid">
              <label className="field">
                <span>{t.account}</span>
                <select
                  name="accountId"
                  defaultValue={String(
                    r.accountId ?? data.accounts[0]?.id ?? "",
                  )}
                  required
                >
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t.method}</span>
                <select
                  name="paymentMethod"
                  defaultValue={String(r.paymentMethod ?? "BANK")}
                >
                  {[
                    ["BANK", t.bank],
                    ["CASH", t.cash],
                    ["CARD", t.card],
                    ["EWALLET", t.ewallet],
                  ].map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>{t.note}</span>
              <textarea
                name="note"
                rows={3}
                maxLength={500}
                defaultValue={String(r.note ?? "")}
              />
            </label>
          </>
        )}
        {resource === "recurring" && (
          <>
            <label className="field">
              <span>{t.interval}</span>
              <select
                name="interval"
                defaultValue={String(r.interval ?? "MONTHLY")}
              >
                <option value="WEEKLY">{t.weekly}</option>
                <option value="MONTHLY">{t.monthly}</option>
                <option value="YEARLY">{t.yearly}</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="active"
                defaultChecked={r.active !== false}
              />
              {t.active}
            </label>
          </>
        )}
        {resource === "budgets" && (
          <>
            <label className="field">
              <span>{t.category}</span>
              <select
                name="categoryId"
                defaultValue={String(r.categoryId ?? "")}
              >
                <option value="">{t.totalBudget}</option>
                {data.categories
                  .filter((c) => c.type === "EXPENSE")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="form-grid">
              {field(t.month, "month", "month", month)}
              {field(t.limit + " (VND)", "amount", "number", "", {
                min: 1,
                max: 1e12,
                step: 1,
              })}
            </div>
          </>
        )}
        {resource === "goals" && (
          <>
            <div className="form-grid">
              {field(t.target + " (VND)", "target", "number", "", {
                min: 1,
                max: 1e12,
                step: 1,
              })}
              {field(t.saved + " (VND)", "saved", "number", 0, {
                min: 0,
                max: 1e12,
                step: 1,
              })}
            </div>
            {field(t.deadline, "deadline", "date", today())}
            <p className="form-help">{t.goalHelp}</p>
          </>
        )}
        {resource === "accounts" && (
          <>
            <label className="field">
              <span>{t.type}</span>
              <select name="kind" defaultValue={String(r.kind ?? "BANK")}>
                {[
                  ["BANK", t.bank],
                  ["CASH", t.cash],
                  ["EWALLET", t.ewallet],
                  ["SAVINGS", t.savingsAccount],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {field(t.opening + " (VND)", "openingBalance", "number", 0, {
              min: -1e12,
              max: 1e12,
              step: 1,
            })}
            <p className="form-help">{t.accountHelp}</p>
          </>
        )}
        {(resource === "categories" || resource === "goals") &&
          field(t.color, "color", "color", "#b3d977")}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-footer">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            {t.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? t.loading : t.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
