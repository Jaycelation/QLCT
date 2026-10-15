"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, CalendarDays, Flag, History, Loader2, Minus, MoreHorizontal, PartyPopper, Pencil, PiggyBank, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  addContributionAction,
  archiveGoalAction,
  createGoalAction,
  deleteContributionAction,
  deleteGoalAction,
  updateGoalAction,
} from "@/actions/finance";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { ColorPicker, IconPicker } from "@/components/forms/pickers";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { localToday } from "@/components/shared/dates-client";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import { GOAL_MILESTONES } from "@/lib/finance";
import type { CategoryIcon as IconName } from "@/lib/constants";
import { contributionSchema, fieldErrors as toFieldErrors, goalSchema, type FieldErrors } from "@/lib/validation";
import type { GoalRow } from "@/server/goals";
import { cn } from "@/lib/utils";

export function GoalsView({ goals }: { goals: GoalRow[] }) {
  const t = useTranslations("goals");
  const tc = useTranslations("common");
  const { money, pct } = useFormat();
  const { pending, run } = useAction();
  const [editing, setEditing] = useState<GoalRow | "new" | null>(null);
  const [contributing, setContributing] = useState<GoalRow | null>(null);
  const [history, setHistory] = useState<GoalRow | null>(null);
  const [deleting, setDeleting] = useState<GoalRow | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const live = goals.filter((g) => g.status !== "ARCHIVED");
  const visible = goals.filter((g) => showArchived || g.status !== "ARCHIVED");
  const saved = live.reduce((s, g) => s + g.saved, 0);
  const target = live.reduce((s, g) => s + g.target, 0);

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("totalSaved")} value={money(saved)} accent="text-income" />
        <Tile label={t("totalTarget")} value={money(target)} sub={target > 0 ? pct((saved / target) * 100) : undefined} />
        <Tile label={t("activeCount")} value={String(live.filter((g) => g.status === "ACTIVE").length)} />
        <Tile label={t("completedCount")} value={String(live.filter((g) => g.status === "COMPLETED").length)} />
      </div>

      {goals.some((g) => g.status === "ARCHIVED") && (
        <div className="flex items-center gap-2">
          <Switch id="g-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="g-archived">{tc("showArchived")}</Label>
        </div>
      )}

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={PiggyBank} title={t("empty")} description={t("emptyHint")} action={<Button onClick={() => setEditing("new")}><Plus /> {t("add")}</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => setEditing(g)}
              onContribute={() => setContributing(g)}
              onHistory={() => setHistory(g)}
              onDelete={() => setDeleting(g)}
              onArchive={() =>
                run(() => archiveGoalAction({ id: g.id, archived: g.status !== "ARCHIVED" }), {
                  success: g.status === "ARCHIVED" ? t("restoredToast") : t("archivedToast"),
                })
              }
            />
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("addTitle") : t("editTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("subtitle")}</DialogDescription>
          </DialogHeader>
          {editing && <GoalForm goal={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!contributing} onOpenChange={(o) => !o && setContributing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{contributing && t("contributeTitle", { name: contributing.name })}</DialogTitle>
            <DialogDescription>
              {contributing && `${t("saved")}: ${money(contributing.saved)} · ${t("remaining")}: ${money(contributing.remaining)}`}
            </DialogDescription>
          </DialogHeader>
          {contributing && <ContributionForm goal={contributing} onClose={() => setContributing(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("history")}</DialogTitle>
            <DialogDescription>{history?.name}</DialogDescription>
          </DialogHeader>
          {history && <HistoryList goal={goals.find((g) => g.id === history.id) ?? history} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("deleteTitle")}
        description={t("deleteHint")}
        pending={pending}
        onConfirm={() => deleting && run(() => deleteGoalAction(deleting.id), { success: t("deleted"), onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card className="gap-1 px-4 py-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("truncate text-xl font-semibold tabular", accent)}>{value}</p>
      {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
    </Card>
  );
}

/** Circular progress ring; the percentage is printed inside so color is never the only cue. */
function Ring({ value, color }: { value: number; color: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const { pct } = useFormat();
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular">{pct(value)}</span>
    </div>
  );
}

function GoalCard({
  goal: g,
  onEdit,
  onContribute,
  onHistory,
  onDelete,
  onArchive,
}: {
  goal: GoalRow;
  onEdit: () => void;
  onContribute: () => void;
  onHistory: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const t = useTranslations("goals");
  const tc = useTranslations("common");
  const { money, date } = useFormat();
  const archived = g.status === "ARCHIVED";

  return (
    <Card className={cn("animate-fade-up gap-4 overflow-hidden", archived && "opacity-60")}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <CategoryIcon icon={g.icon} color={g.color} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{g.name}</p>
              {g.completed ? (
                <Badge variant="success">{t("completed")}</Badge>
              ) : archived ? (
                <Badge variant="secondary">{tc("archived")}</Badge>
              ) : (
                <Badge variant="outline">{t("active")}</Badge>
              )}
            </div>
          </div>
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
              <DropdownMenuItem onSelect={onHistory}>
                <History /> {t("history")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onArchive}>
                {archived ? <ArchiveRestore /> : <Archive />} {archived ? tc("unarchive") : tc("archive")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> {tc("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4">
          <Ring value={g.progress} color={g.color} />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-lg font-semibold tabular">{money(g.saved)}</p>
            <p className="text-muted-foreground tabular">/ {money(g.target)}</p>
            {!g.completed && <p className="text-muted-foreground text-xs">{t("remaining")}: {money(g.remaining)}</p>}
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-2 text-xs">{t("milestones")}</p>
          <div className="flex gap-1.5">
            {GOAL_MILESTONES.map((m) => {
              const reached = g.milestonesReached.includes(m);
              return (
                <span
                  key={m}
                  title={reached ? t("milestoneReached", { milestone: m }) : undefined}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-md border py-1 text-xs font-medium tabular",
                    reached ? "border-transparent text-white" : "text-muted-foreground",
                  )}
                  style={reached ? { backgroundColor: g.color } : undefined}
                >
                  {reached && <Flag className="size-3" />}
                  {m}%
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {g.deadline ? date(g.deadline) : t("noDeadline")}
          </span>
          {g.daysLeft !== null && !g.completed && (
            <span className={cn(g.overdue && "text-expense font-medium")}>
              {g.overdue ? t("overdue", { days: -g.daysLeft }) : t("daysLeft", { days: g.daysLeft })}
            </span>
          )}
          {g.monthlyNeeded !== null && !g.overdue && <span>{t("monthlyNeeded", { amount: money(g.monthlyNeeded) })}</span>}
        </div>

        {g.completed ? (
          <p className="bg-income/10 text-income flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
            <PartyPopper className="size-4" /> {t("congrats")}
          </p>
        ) : (
          !archived && (
            <Button variant="outline" className="w-full" onClick={onContribute}>
              <PiggyBank /> {t("contribute")}
            </Button>
          )
        )}
      </CardContent>
      <div className="h-1" style={{ backgroundColor: g.color }} />
    </Card>
  );
}

function GoalForm({ goal, onClose }: { goal: GoalRow | null; onClose: () => void }) {
  const t = useTranslations("goals");
  const tc = useTranslations("common");
  const { pending, run } = useAction();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState<number | null>(goal?.target ?? null);
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [color, setColor] = useState(goal?.color ?? "#6366f1");
  const [icon, setIcon] = useState<IconName>((goal?.icon as IconName) ?? "piggy-bank");
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { name, targetAmount: target ?? "", deadline: deadline || undefined, color, icon };
    const parsed = goalSchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    run(() => (goal ? updateGoalAction({ id: goal.id, data: input }) : createGoalAction(input)), {
      success: goal ? t("updated") : t("created"),
      onSuccess: onClose,
      onError: setErrors,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <FormField id="g-name" label={tc("name")} error={errors.name}>
        <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} maxLength={80} aria-invalid={!!errors.name || undefined} autoFocus />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="g-target" label={t("target")} error={errors.targetAmount}>
          <MoneyInput id="g-target" value={target} onChange={setTarget} invalid={!!errors.targetAmount} />
        </FormField>
        <FormField id="g-deadline" label={t("deadline")} error={errors.deadline} optional>
          <Input id="g-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </FormField>
      </div>
      <FormField id="g-icon" label={tc("icon")}>
        <IconPicker value={icon} onChange={setIcon} color={color} label={tc("icon")} />
      </FormField>
      <FormField id="g-color" label={tc("color")}>
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

function ContributionForm({ goal, onClose }: { goal: GoalRow; onClose: () => void }) {
  const t = useTranslations("goals");
  const tc = useTranslations("common");
  const { pending, run } = useAction();
  const [direction, setDirection] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(localToday());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { goalId: goal.id, direction, amount: amount ?? "", date, note };
    const parsed = contributionSchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    run(() => addContributionAction(input), { success: t("contributed"), onSuccess: onClose, onError: setErrors });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup">
        {(["deposit", "withdraw"] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={direction === d}
            onClick={() => setDirection(d)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all",
              direction === d ? cn("bg-background shadow-sm", d === "deposit" ? "text-income" : "text-expense") : "text-muted-foreground",
            )}
          >
            {d === "deposit" ? <Plus className="size-4" /> : <Minus className="size-4" />}
            {t(d)}
          </button>
        ))}
      </div>
      <FormField id="c-amount" label={tc("amount")} error={errors.amount}>
        <MoneyInput id="c-amount" value={amount} onChange={setAmount} invalid={!!errors.amount} autoFocus />
      </FormField>
      <FormField id="c-date" label={tc("date")} error={errors.date}>
        <Input id="c-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </FormField>
      <FormField id="c-note" label={tc("note")} error={errors.note} optional>
        <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
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

function HistoryList({ goal }: { goal: GoalRow }) {
  const t = useTranslations("goals");
  const tc = useTranslations("common");
  const { money, date } = useFormat();
  const { pending, run } = useAction();
  if (goal.contributions.length === 0) return <p className="text-muted-foreground py-6 text-center text-sm">{t("noHistory")}</p>;
  return (
    <ul className="-mx-2 max-h-[60vh] divide-y overflow-y-auto">
      {goal.contributions.map((c) => (
        <li key={c.id} className="flex items-center gap-3 px-2 py-2.5">
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold tabular", c.amount >= 0 ? "text-income" : "text-expense")}>{money(c.amount, { signed: true })}</p>
            <p className="text-muted-foreground truncate text-xs">
              {date(c.date)}
              {c.note && ` · ${c.note}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label={tc("delete")}
            onClick={() => run(() => deleteContributionAction(c.id), { success: t("contributionDeleted") })}
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}
