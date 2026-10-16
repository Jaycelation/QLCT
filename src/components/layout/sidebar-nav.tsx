"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "./nav-items";

export function Brand({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("common");
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2 font-semibold">
      <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm">
        <Wallet2 className="size-4.5" />
      </span>
      <span className={compact ? "hidden text-lg tracking-tight whitespace-nowrap min-[400px]:inline" : "text-lg tracking-tight whitespace-nowrap"}>{t("appName")}</span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">{t(group.label)}</p>
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="size-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
