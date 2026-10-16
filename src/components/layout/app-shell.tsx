"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, Menu, Plus, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/actions/auth";
import { TransactionFormDialog } from "@/components/forms/transaction-form-dialog";
import type { AccountOption, CategoryOption } from "@/components/shared/types";
import { LanguageToggle, ThemeToggle } from "./preferences-menu";
import { Brand, SidebarNav } from "./sidebar-nav";

interface Props {
  user: { name: string; email: string };
  accounts: AccountOption[];
  categories: CategoryOption[];
  children: React.ReactNode;
}

export function AppShell({ user, accounts, categories, children }: Props) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {tc("skipToContent")}
      </a>
      <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r px-4 py-5 lg:flex">
        <Brand />
        <SidebarNav />
        <UserCard user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("menu")}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar gap-8 px-4 py-5" closeLabel={tc("close")}>
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <Brand />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
              <UserCard user={user} />
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" onClick={() => setQuickAdd(true)} className="mr-1 hidden sm:inline-flex">
              <Plus /> {t("quickAdd")}
            </Button>
            <LanguageToggle />
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>

      {/* Floating add button on phones. */}
      <Button
        size="icon"
        onClick={() => setQuickAdd(true)}
        aria-label={t("quickAdd")}
        className="fixed right-5 bottom-5 z-40 size-14 rounded-full shadow-lg sm:hidden [&_svg]:size-6"
      >
        <Plus />
      </Button>

      <TransactionFormDialog open={quickAdd} onOpenChange={setQuickAdd} accounts={accounts} categories={categories} />
    </div>
  );
}

function UserCard({ user }: { user: { name: string; email: string } }) {
  return (
    <div className="mt-auto flex items-center gap-3 rounded-lg border p-3">
      <Avatar name={user.name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: { name: string; email: string } }) {
  const t = useTranslations("nav");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={user.name}>
          <Avatar name={user.name} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> {t("settings")}
          </Link>
        </DropdownMenuItem>
        <form action={logoutAction}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut /> {t("logout")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
