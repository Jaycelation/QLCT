import type { AccountType, Frequency, PaymentMethod, TransactionType } from "@prisma/client";

export const LOCALES = ["vi", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "vi";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const satisfies readonly TransactionType[];
export const ACCOUNT_TYPES = [
  "CASH",
  "BANK",
  "E_WALLET",
  "CREDIT_CARD",
  "SAVINGS",
  "INVESTMENT",
  "OTHER",
] as const satisfies readonly AccountType[];
export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "E_WALLET",
  "OTHER",
] as const satisfies readonly PaymentMethod[];
export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const satisfies readonly Frequency[];

export const CATEGORY_ICONS = [
  "utensils",
  "shopping-bag",
  "car",
  "receipt",
  "clapperboard",
  "heart-pulse",
  "graduation-cap",
  "house",
  "users",
  "plane",
  "shirt",
  "gift",
  "coffee",
  "smartphone",
  "dumbbell",
  "paw-print",
  "baby",
  "wrench",
  "briefcase",
  "trending-up",
  "coins",
  "piggy-bank",
  "landmark",
  "circle-ellipsis",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const COLOR_SWATCHES = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#64748b",
] as const;

export interface DefaultCategory {
  key: string;
  name: string;
  type: TransactionType;
  icon: CategoryIcon;
  color: string;
}

/** Created for every new user. `name` is the Vietnamese label; UI translates by `key`. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { key: "food", name: "Ăn uống", type: "EXPENSE", icon: "utensils", color: "#f97316" },
  { key: "shopping", name: "Mua sắm", type: "EXPENSE", icon: "shopping-bag", color: "#ec4899" },
  { key: "transport", name: "Di chuyển", type: "EXPENSE", icon: "car", color: "#3b82f6" },
  { key: "bills", name: "Hóa đơn", type: "EXPENSE", icon: "receipt", color: "#eab308" },
  { key: "entertainment", name: "Giải trí", type: "EXPENSE", icon: "clapperboard", color: "#8b5cf6" },
  { key: "healthcare", name: "Y tế", type: "EXPENSE", icon: "heart-pulse", color: "#ef4444" },
  { key: "education", name: "Giáo dục", type: "EXPENSE", icon: "graduation-cap", color: "#06b6d4" },
  { key: "housing", name: "Nhà ở", type: "EXPENSE", icon: "house", color: "#14b8a6" },
  { key: "family", name: "Gia đình", type: "EXPENSE", icon: "users", color: "#f43f5e" },
  { key: "other_expense", name: "Chi khác", type: "EXPENSE", icon: "circle-ellipsis", color: "#64748b" },
  { key: "salary", name: "Lương", type: "INCOME", icon: "briefcase", color: "#10b981" },
  { key: "bonus", name: "Thưởng", type: "INCOME", icon: "gift", color: "#22c55e" },
  { key: "investment", name: "Đầu tư", type: "INCOME", icon: "trending-up", color: "#0ea5e9" },
  { key: "side_income", name: "Thu nhập phụ", type: "INCOME", icon: "coins", color: "#84cc16" },
  { key: "other_income", name: "Thu khác", type: "INCOME", icon: "circle-ellipsis", color: "#64748b" },
];

export const DEFAULT_ACCOUNT = { name: "Tiền mặt", type: "CASH" as AccountType, color: "#10b981" };

export const SESSION_COOKIE = "fm_session";
export const SESSION_TTL_DAYS = 30;
