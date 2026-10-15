"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, FolderTree, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { archiveCategoryAction, createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/actions/finance";
import { FormField } from "@/components/forms/form-field";
import { ColorPicker, IconPicker } from "@/components/forms/pickers";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAction } from "@/components/shared/use-action";
import { useFormat } from "@/components/shared/use-format";
import { categorySchema, fieldErrors as toFieldErrors, type FieldErrors } from "@/lib/validation";
import type { CategoryIcon as IconName } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  key: string | null;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  archived: boolean;
  used: number;
}

type Editing = { category: Category | null; type: "INCOME" | "EXPENSE" } | null;

export function CategoriesView({ categories }: { categories: Category[] }) {
  const t = useTranslations("categoriesPage");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const { categoryName } = useFormat();
  const { pending, run } = useAction();
  const [tab, setTab] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button onClick={() => setEditing({ category: null, type: tab })}>
            <Plus /> {t("add")}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="EXPENSE">{tt("EXPENSE")}</TabsTrigger>
            <TabsTrigger value="INCOME">{tt("INCOME")}</TabsTrigger>
          </TabsList>
          {categories.some((c) => c.archived) && (
            <div className="flex items-center gap-2">
              <Switch id="cat-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="cat-archived">{tc("showArchived")}</Label>
            </div>
          )}
        </div>
        {(["EXPENSE", "INCOME"] as const).map((type) => {
          const list = categories.filter((c) => c.type === type && (showArchived || !c.archived));
          return (
            <TabsContent key={type} value={type} className="mt-4">
              {list.length === 0 ? (
                <Card>
                  <EmptyState icon={FolderTree} title={t("empty")} />
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((c) => (
                    <Card key={c.id} className={cn("animate-fade-up flex-row items-center gap-3 px-4 py-3", c.archived && "opacity-60")}>
                      <CategoryIcon icon={c.icon} color={c.color} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{categoryName(c)}</p>
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          {t("used", { count: c.used })}
                          {c.key && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{t("default")}</Badge>}
                          {c.archived && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{tc("archived")}</Badge>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={tc("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing({ category: c, type: c.type })}>
                            <Pencil /> {tc("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              run(() => archiveCategoryAction({ id: c.id, archived: !c.archived }), {
                                success: c.archived ? t("restoredToast") : t("archivedToast"),
                              })
                            }
                          >
                            {c.archived ? <ArchiveRestore /> : <Archive />} {c.archived ? tc("unarchive") : tc("archive")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                            <Trash2 /> {tc("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.category ? t("editTitle") : t("addTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{t("subtitle")}</DialogDescription>
          </DialogHeader>
          {editing && <CategoryForm editing={editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("deleteTitle")}
        pending={pending}
        onConfirm={() => deleting && run(() => deleteCategoryAction(deleting.id), { success: t("deleted"), onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}

function CategoryForm({ editing, onClose }: { editing: NonNullable<Editing>; onClose: () => void }) {
  const t = useTranslations("categoriesPage");
  const tc = useTranslations("common");
  const tt = useTranslations("types");
  const { categoryName } = useFormat();
  const { pending, run } = useAction();
  const c = editing.category;
  const [name, setName] = useState(c ? categoryName(c) : "");
  const [type, setType] = useState(editing.type);
  const [icon, setIcon] = useState<IconName>((c?.icon as IconName) ?? "circle-ellipsis");
  const [color, setColor] = useState(c?.color ?? "#6366f1");
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Keep the stored (Vietnamese) name for an untouched default category so it stays translatable.
    const finalName = c && c.key && name === categoryName(c) ? c.name : name;
    const input = { name: finalName, type, icon, color };
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    run(() => (c ? updateCategoryAction({ id: c.id, data: input }) : createCategoryAction(input)), {
      success: c ? t("updated") : t("created"),
      onSuccess: onClose,
      onError: setErrors,
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="lg" />
        <FormField id="cat-name" label={tc("name")} error={errors.name} className="flex-1">
          <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-invalid={!!errors.name || undefined} autoFocus />
        </FormField>
      </div>
      <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="radiogroup" aria-label={tc("type")}>
        {(["EXPENSE", "INCOME"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={type === v}
            onClick={() => setType(v)}
            className={cn("cursor-pointer rounded-md py-1.5 text-sm font-medium transition-all", type === v ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            {tt(v)}
          </button>
        ))}
      </div>
      <FormField id="cat-icon" label={tc("icon")}>
        <IconPicker value={icon} onChange={setIcon} color={color} label={tc("icon")} />
      </FormField>
      <FormField id="cat-color" label={tc("color")}>
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
