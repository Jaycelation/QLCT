import {
  ArrowLeftRight,
  BarChart3,
  FolderTree,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Settings,
  Target,
  Wallet,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "overview",
    items: [
      { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
      { href: "/transactions", key: "transactions", icon: ArrowLeftRight },
      { href: "/budgets", key: "budgets", icon: Target },
      { href: "/goals", key: "goals", icon: PiggyBank },
      { href: "/reports", key: "reports", icon: BarChart3 },
    ],
  },
  {
    label: "manage",
    items: [
      { href: "/accounts", key: "accounts", icon: Wallet },
      { href: "/categories", key: "categories", icon: FolderTree },
      { href: "/recurring", key: "recurring", icon: Repeat },
      { href: "/settings", key: "settings", icon: Settings },
    ],
  },
] as const;
