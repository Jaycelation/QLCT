"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Sprout,
  LayoutDashboard,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Target,
  Wallet,
  Settings,
  Repeat,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Pencil,
  Trash2,
  SlidersHorizontal,
  TrendingUp,
  ShieldCheck,
  Landmark,
  MoreHorizontal,
  CalendarDays,
  Check,
  LoaderCircle,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { AuthScreen } from "./auth-screen";
import { RecordForm, type Editor } from "./record-form";
import { CashChart, SpendingChart } from "./charts";
import { copy } from "@/lib/i18n";
import { today, totals, previousMonth, reportRange, csv } from "@/lib/finance";
import type {
  FinanceData,
  Lang,
  User,
  Transaction,
  Budget,
  Goal,
} from "@/lib/types";
const blank: FinanceData = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  recurring: [],
};
type Page =
  | "overview"
  | "transactions"
  | "budgets"
  | "goals"
  | "reports"
  | "accounts"
  | "recurring"
  | "settings";
const nav = [
  ["overview", LayoutDashboard],
  ["transactions", ArrowLeftRight],
  ["budgets", ChartNoAxesCombined],
  ["goals", Target],
  ["reports", TrendingUp],
  ["accounts", Wallet],
  ["recurring", Repeat],
] as const;
export function FinanceApp() {
  const [lang, setLang] = useState<Lang>("vi");
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<FinanceData>(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState<Page>("overview");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<{
    resource: string;
    id: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pagination, setPagination] = useState(0);
  const [period, setPeriod] = useState("month");
  const [reportDay, setReportDay] = useState(today());
  const t = copy[lang];
  const money = (n: number) =>
    new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(n);
  const dateLabel = (d: string) =>
    new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(d + "T00:00:00Z"));
  useEffect(() => {
    try {
      setLang(localStorage.getItem("finora-lang") === "en" ? "en" : "vi");
      setDark(localStorage.getItem("finora-theme") === "dark");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("finora-lang", lang);
      localStorage.setItem("finora-theme", dark ? "dark" : "light");
    } catch {}
  }, [lang, dark]);
  const errorText = (code: string) => {
    const vi: Record<string, string> = {
      UNAUTHENTICATED: "Phiên đăng nhập đã hết hạn.",
      NOT_FOUND: "Không tìm thấy bản ghi.",
      ALREADY_EXISTS: "Bản ghi đã tồn tại.",
      RECORD_IN_USE:
        "Bản ghi đang được sử dụng. Hãy xóa các giao dịch hoặc quy tắc liên quan trước.",
      INVALID_INPUT: "Vui lòng kiểm tra các trường đã nhập.",
      CATEGORY_TYPE_IN_USE: "Không thể đổi loại danh mục đang được sử dụng.",
      FUTURE_DATE_USE_RECURRING:
        "Dùng giao dịch định kỳ cho ngày trong tương lai.",
      PLEASE_RETRY: "Dữ liệu vừa thay đổi. Vui lòng thử lại.",
    };
    const en: Record<string, string> = {
      UNAUTHENTICATED: "Your session has expired.",
      NOT_FOUND: "Record not found.",
      ALREADY_EXISTS: "This record already exists.",
      RECORD_IN_USE:
        "This record is in use. Remove linked transactions or rules first.",
      INVALID_INPUT: "Please check your input.",
      CATEGORY_TYPE_IN_USE: "Cannot change the type of a category in use.",
      FUTURE_DATE_USE_RECURRING: "Use recurring entries for future dates.",
      PLEASE_RETRY: "Data changed. Please try again.",
    };
    return (lang === "vi" ? vi : en)[code] ?? t.error;
  };
  async function api(path: string, method = "GET", payload?: unknown) {
    const res = await fetch("/api/" + path, {
      method,
      headers: method === "GET" ? {} : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        setUser(null);
        setData(blank);
      }
      throw new Error(errorText(body.error));
    }
    return body;
  }
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error();
      const auth = await res.json();
      setUser(auth.user);
      if (auth.user) {
        const processed = await fetch("/api/finance/process-recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!processed.ok) throw new Error();
        const finance = await fetch("/api/finance");
        if (!finance.ok) throw new Error();
        setData(await finance.json());
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(
    () => setPagination(0),
    [query, typeFilter, categoryFilter, accountFilter, from, to],
  );
  const refresh = async () => setData(await api("finance"));
  async function save(
    resource: string,
    id: string | undefined,
    value: unknown,
  ) {
    await api(
      "finance/" + resource + (id ? "/" + id : ""),
      id ? "PATCH" : "POST",
      value,
    );
    await refresh();
    toast.success(t.savedToast);
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(
        "finance/" + deleting.resource + "/" + deleting.id,
        "DELETE",
        {},
      );
      await refresh();
      setDeleting(null);
      toast.success(t.deletedToast);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(resource: string, record?: object) {
    setEditor({
      resource,
      record: record as Record<string, unknown> | undefined,
    });
  }
  function go(p: Page) {
    setPage(p);
    setMobile(false);
  }
  const entries = data.transactions.filter((x) => x.date.startsWith(month));
  const sum = totals(entries);
  const prev = totals(
    data.transactions.filter((x) => x.date.startsWith(previousMonth(month))),
  );
  const all = totals(data.transactions);
  const balance =
    data.accounts.reduce((a, b) => a + b.openingBalance, 0) +
    all.income -
    all.expenses;
  const budgetItems = data.budgets.filter((b) => b.month === month);
  const spending = (b: Budget) =>
    entries
      .filter(
        (e) =>
          e.type === "EXPENSE" &&
          (!b.categoryId || e.categoryId === b.categoryId),
      )
      .reduce((a, e) => a + e.amount, 0);
  const category = (id: string | null) =>
    data.categories.find((c) => c.id === id);
  const distribution = (list: Transaction[]) =>
    data.categories
      .map((c) => ({
        name: c.name,
        color: c.color,
        value: list
          .filter((x) => x.type === "EXPENSE" && x.categoryId === c.id)
          .reduce((a, x) => a + x.amount, 0),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(month + "-01T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - 5 + i);
    const m = d.toISOString().slice(0, 7);
    return {
      name: new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
        month: "short",
        timeZone: "UTC",
      }).format(d),
      ...totals(data.transactions.filter((x) => x.date.startsWith(m))),
    };
  });
  const filtered = data.transactions.filter(
    (x) =>
      (!typeFilter || x.type === typeFilter) &&
      (!categoryFilter || x.categoryId === categoryFilter) &&
      (!accountFilter || x.accountId === accountFilter) &&
      (!from || x.date >= from) &&
      (!to || x.date <= to) &&
      (!query ||
        (x.note + " " + category(x.categoryId)?.name)
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())),
  );
  const reportDates = reportRange(period, reportDay);
  const reportEntries = data.transactions.filter(
    (x) => x.date >= reportDates.from && x.date <= reportDates.to,
  );
  const reportSum = totals(reportEntries);
  const reportCategories = distribution(reportEntries);
  function download(contents: string, filename: string) {
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportTransactions() {
    download(
      csv([
        [t.date, t.type, "VND", t.category, t.account, t.method, t.note],
        ...filtered.map((x) => [
          x.date,
          x.type,
          x.amount,
          category(x.categoryId)?.name,
          data.accounts.find((a) => a.id === x.accountId)?.name,
          x.paymentMethod,
          x.note,
        ]),
      ]),
      "finora-transactions.csv",
    );
  }
  function exportReport() {
    download(
      csv([
        [t.period, reportDates.from, reportDates.to],
        [t.income, reportSum.income],
        [t.expenses, reportSum.expenses],
        [t.savings, reportSum.income - reportSum.expenses],
        [],
        [t.category, "VND"],
        ...reportCategories.map((c) => [c.name, c.value]),
      ]),
      "finora-report.csv",
    );
  }
  const empty = (action?: () => void) => (
    <div className="empty">
      <div className="empty-icon">
        <Sprout size={28} />
      </div>
      <h3>{t.empty}</h3>
      <p>{t.emptySub}</p>
      {action && (
        <Button variant="outline" onClick={action}>
          <Plus size={16} />
          {t.add}
        </Button>
      )}
    </div>
  );
  const actions = (resource: string, item: { id: string }) => (
    <div className="row-actions">
      <Button
        variant="ghost"
        size="icon"
        title={t.edit}
        aria-label={t.edit}
        onClick={() => open(resource, item)}
      >
        <Pencil size={15} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={t.delete}
        aria-label={t.delete}
        onClick={() => setDeleting({ resource, id: item.id })}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  );
  function transactionTable(list: Transaction[], compact = false) {
    return !list.length ? (
      empty(() => open("transactions"))
    ) : (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.transactions}</th>
              <th>{t.category}</th>
              {!compact && <th>{t.account}</th>}
              <th>{t.date}</th>
              <th className="text-right">{t.amount}</th>
              <th>
                <span className="sr-only">{t.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.id}>
                <td>
                  <div className="transaction-name">
                    <span
                      className={
                        "transaction-icon " +
                        (x.type === "INCOME" ? "positive" : "")
                      }
                      style={{
                        background: category(x.categoryId)?.color + "25",
                      }}
                    >
                      {x.type === "INCOME" ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </span>
                    <span>
                      <strong>{x.note || category(x.categoryId)?.name}</strong>
                      <small>
                        {x.type === "INCOME" ? t.income : t.expenses}
                      </small>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="category-badge">
                    <i style={{ background: category(x.categoryId)?.color }} />
                    {category(x.categoryId)?.name}
                  </span>
                </td>
                {!compact && (
                  <td>
                    {data.accounts.find((a) => a.id === x.accountId)?.name}
                  </td>
                )}
                <td className="muted nowrap">{dateLabel(x.date)}</td>
                <td
                  className={
                    "amount text-right nowrap " +
                    (x.type === "INCOME" ? "positive" : "")
                  }
                >
                  {x.type === "INCOME" ? "+" : "−"}
                  {money(x.amount)}
                </td>
                <td>{actions("transactions", x)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  function budgetCard(b: Budget, compact = false) {
    const spent = spending(b);
    const ratio = (spent / b.amount) * 100;
    return (
      <div key={b.id} className={compact ? "budget-line" : "panel budget-card"}>
        <div className="split">
          <div className="label-icon">
            <span
              className="category-dot"
              style={{ background: category(b.categoryId)?.color ?? "#b3d977" }}
            />
            <strong>{category(b.categoryId)?.name ?? t.totalBudget}</strong>
          </div>
          {compact ? (
            <span className={ratio >= 100 ? "negative" : "muted"}>
              {Math.round(ratio)}%
            </span>
          ) : (
            actions("budgets", b)
          )}
        </div>
        <div className="budget-amount">
          <b>{money(spent)}</b>
          <span> / {money(b.amount)}</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={category(b.categoryId)?.name ?? t.totalBudget}
          aria-valuenow={Math.round(Math.min(ratio, 100))}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              width: Math.min(ratio, 100) + "%",
              background:
                ratio >= 100
                  ? "#d77964"
                  : ratio >= 80
                    ? "#d6aa5d"
                    : (category(b.categoryId)?.color ?? "#b3d977"),
            }}
          />
        </div>
        {!compact && (
          <div className="split muted small">
            <span className={ratio >= 100 ? "negative" : ""}>
              {money(Math.abs(b.amount - spent))}{" "}
              {ratio >= 100 ? t.over : t.remaining}
            </span>
            <span>
              {Math.round(ratio)}% {t.used}
            </span>
          </div>
        )}
      </div>
    );
  }
  function goalCard(g: Goal, compact = false) {
    const ratio = (g.saved / g.target) * 100;
    return (
      <div className={compact ? "goal-line" : "panel goal-card"} key={g.id}>
        <div className="split">
          <span className="goal-symbol" style={{ background: g.color + "30" }}>
            {ratio >= 100 ? <Check size={21} /> : <Target size={21} />}
          </span>
          {!compact && actions("goals", g)}
        </div>
        <h3>{g.name}</h3>
        <div className="split">
          <span>
            <b>{money(g.saved)}</b>
            <small className="muted"> / {money(g.target)}</small>
          </span>
          <span className="small">{Math.round(ratio)}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={g.name}
          aria-valuenow={Math.min(100, Math.round(ratio))}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{ width: Math.min(100, ratio) + "%", background: g.color }}
          />
        </div>
        <div className="split muted small">
          <span>
            <CalendarDays size={13} />
            {dateLabel(g.deadline)}
          </span>
          {ratio >= 100 ? (
            <span className="positive">{t.completed}</span>
          ) : (
            !compact && (
              <span>
                {t.milestone}: {Math.min(100, Math.floor(ratio / 25) * 25 + 25)}
                %
              </span>
            )
          )}
        </div>
      </div>
    );
  }
  const monthPicker = (
    <div className="month-picker">
      <button
        aria-label={t.previous}
        onClick={() => setMonth(previousMonth(month))}
      >
        <ChevronLeft size={17} />
      </button>
      <input
        aria-label={t.selectedMonth}
        type="month"
        value={month}
        onChange={(e) => e.target.value && setMonth(e.target.value)}
      />
      <button
        aria-label={t.next}
        onClick={() => {
          const d = new Date(month + "-01T00:00:00Z");
          d.setUTCMonth(d.getUTCMonth() + 1);
          setMonth(d.toISOString().slice(0, 7));
        }}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
  const panelTitle = (title: string, action?: () => void) => (
    <div className="panel-title">
      <h3>{title}</h3>
      {action && (
        <button className="text-link" onClick={action}>
          {t.seeAll}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
  const stat = (
    label: string,
    value: number,
    icon: React.ReactNode,
    featured = false,
    previous?: number,
  ) => (
    <div className={"stat-card " + (featured ? "featured" : "")}>
      <div className="split">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{money(value)}</strong>
      <div className="stat-footer">
        {previous !== undefined && previous !== 0 ? (
          <>
            <span className="stat-change">
              {value >= previous ? "↗" : "↘"}{" "}
              {Math.abs(
                ((value - previous) / Math.abs(previous)) * 100,
              ).toFixed(1)}
              %
            </span>
            <span>{t.compare}</span>
          </>
        ) : (
          <span>
            {featured ? t.allTime : previous === 0 ? t.noPrevious : month}
          </span>
        )}
      </div>
    </div>
  );
  if (loading)
    return (
      <div className="loading-screen">
        <Sprout size={38} />
        <span>finora.</span>
        <LoaderCircle className="spin" size={22} />
        <p>{t.loading}</p>
      </div>
    );
  if (error)
    return (
      <div className="loading-screen">
        <ShieldCheck size={36} />
        <h2>{t.connection}</h2>
        <p>{t.setup}</p>
        <Button onClick={load}>{t.retry}</Button>
      </div>
    );
  if (!user) return <AuthScreen lang={lang} setLang={setLang} onLogin={load} />;
  return (
    <div className="app-shell">
      <Toaster
        richColors
        position="bottom-right"
        theme={dark ? "dark" : "light"}
      />
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label={t.cancel}
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("overview");
          }}
        >
          <span className="brand-icon">
            <Sprout size={25} />
          </span>
          finora<span className="brand-dot">.</span>
        </a>
        <span className="nav-label">{t.workspace}</span>
        <nav>
          {nav.map(([id, Icon]) => (
            <button
              key={id}
              className={page === id ? "selected" : ""}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              {t[id]}
              {id === "overview" && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-flower">✳</span>
          <h4>
            {lang === "vi"
              ? "Từng chút một, tốt hơn."
              : "Small steps. Better days."}
          </h4>
          <p>
            {lang === "vi"
              ? "Thói quen nhỏ hôm nay, tự do tài chính ngày mai."
              : "A little intention today. More freedom tomorrow."}
          </p>
          <button onClick={() => go("goals")}>
            {t.goals}
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={page === "settings" ? "selected" : ""}
            onClick={() => go("settings")}
          >
            <Settings size={19} />
            {t.settings}
          </button>
          <div className="profile">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t.logout}
              onClick={async () => {
                try {
                  await api("auth/logout", "POST", {});
                  setData(blank);
                  setUser(null);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu"
              aria-label="Menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              {t.workspace.toLocaleLowerCase()} <span>/</span> <b>{t[page]}</b>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="private-badge">
              <span />
              {t.secure}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? t.light : t.dark}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <button
              className="lang-btn"
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            >
              {lang.toUpperCase()}
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "overview"
                  ? new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Asia/Ho_Chi_Minh",
                    }).format(new Date())
                  : "FINORA / " + t[page].toUpperCase()}
              </div>
              <h1>
                {page === "overview"
                  ? `${t.greeting}, ${user.name.split(" ")[0]} 👋`
                  : page === "reports"
                    ? t.reportTitle
                    : t[page]}
              </h1>
              <p>
                {page === "overview"
                  ? t.subtitle
                  : page === "reports"
                    ? t.reportSub
                    : page === "accounts"
                      ? t.accountHelp
                      : page === "goals"
                        ? t.goalHelp
                        : page === "recurring"
                          ? t.recurringHelp
                          : page === "settings"
                            ? t.preferences
                            : ""}
              </p>
            </div>
            <div className="heading-actions">
              {(page === "overview" || page === "budgets") && monthPicker}
              {page !== "settings" && (
                <Button
                  onClick={() =>
                    open(
                      page === "overview" || page === "reports"
                        ? "transactions"
                        : page,
                    )
                  }
                >
                  <Plus size={17} />
                  {page === "budgets"
                    ? t.newBudget
                    : page === "goals"
                      ? t.newGoal
                      : page === "accounts"
                        ? t.newAccount
                        : page === "recurring"
                          ? t.newRecurring
                          : t.add}
                </Button>
              )}
            </div>
          </div>
          {page === "overview" && (
            <>
              <div className="stats-grid">
                {stat(t.balance, balance, <Wallet size={18} />, true)}
                {stat(
                  t.income,
                  sum.income,
                  <ArrowDownLeft size={18} />,
                  false,
                  prev.income,
                )}
                {stat(
                  t.expenses,
                  sum.expenses,
                  <ArrowUpRight size={18} />,
                  false,
                  prev.expenses,
                )}
                {stat(
                  t.savings,
                  sum.income - sum.expenses,
                  <Sprout size={18} />,
                  false,
                  prev.income - prev.expenses,
                )}
              </div>
              <div className="charts-grid">
                <section className="panel cash-panel">
                  <div className="panel-title">
                    <div>
                      <h3>{t.cashflow}</h3>
                      <p>{t.cashflowSub}</p>
                    </div>
                    <div className="chart-legend">
                      <span>
                        <i />
                        {t.income}
                      </span>
                      <span>
                        <i />
                        {t.expenses}
                      </span>
                    </div>
                  </div>
                  {chartData.some((d) => d.income || d.expenses) ? (
                    <CashChart
                      data={chartData}
                      incomeLabel={t.income}
                      expenseLabel={t.expenses}
                      format={money}
                    />
                  ) : (
                    empty()
                  )}
                </section>
                <section className="panel">
                  {panelTitle(t.distribution)}
                  {sum.expenses ? (
                    <SpendingChart
                      data={distribution(entries)}
                      total={sum.expenses}
                      format={money}
                    />
                  ) : (
                    empty()
                  )}
                </section>
              </div>
              <div className="insight-strip">
                <span>
                  <Sprout size={21} />
                </span>
                <div>
                  <b>{t.insight}</b>
                  <p>
                    {entries.length
                      ? sum.income >= sum.expenses
                        ? t.healthGood
                        : t.healthBad
                      : t.emptySub}{" "}
                    {budgetItems.filter((b) => spending(b) / b.amount >= 0.8)
                      .length > 0 &&
                      `${budgetItems.filter((b) => spending(b) / b.amount >= 0.8).length} ${t.budgetWarning}`}
                  </p>
                </div>
                <ArrowUpRight size={20} />
              </div>
              <div className="lower-grid">
                <section className="panel transactions-panel">
                  {panelTitle(t.recent, () => go("transactions"))}
                  {transactionTable(entries.slice(0, 5), true)}
                </section>
                <section className="panel">
                  {panelTitle(t.budgetOverview, () => go("budgets"))}
                  {budgetItems.length
                    ? budgetItems.slice(0, 3).map((b) => budgetCard(b, true))
                    : empty()}
                </section>
              </div>
              <section className="panel goals-overview">
                {panelTitle(t.goalsOverview, () => go("goals"))}
                {data.goals.length ? (
                  <div className="goals-mini-grid">
                    {data.goals.slice(0, 3).map((g) => goalCard(g, true))}
                  </div>
                ) : (
                  empty()
                )}
              </section>
            </>
          )}
          {page === "transactions" && (
            <section className="panel transactions-panel">
              <div className="filter-bar">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    aria-label={t.search}
                    placeholder={t.search}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={exportTransactions}>
                  <Download size={16} />
                  {t.export}
                </Button>
              </div>
              <div className="filters">
                <select
                  aria-label={t.type}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">
                    {t.all} · {t.type}
                  </option>
                  <option value="EXPENSE">{t.expenses}</option>
                  <option value="INCOME">{t.income}</option>
                </select>
                <select
                  aria-label={t.category}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">
                    {t.all} · {t.category}
                  </option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t.account}
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                >
                  <option value="">
                    {t.all} · {t.account}
                  </option>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <label>
                  {t.from}
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  {t.to}
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setTypeFilter("");
                    setCategoryFilter("");
                    setAccountFilter("");
                    setFrom("");
                    setTo("");
                  }}
                >
                  {t.clear}
                </Button>
              </div>
              {transactionTable(
                filtered.slice(pagination * 12, pagination * 12 + 12),
              )}
              <div className="table-footer">
                <span>
                  {filtered.length} {t.records}
                </span>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination === 0}
                    onClick={() => setPagination(pagination - 1)}
                  >
                    <ChevronLeft size={15} />
                    {t.previous}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(pagination + 1) * 12 >= filtered.length}
                    onClick={() => setPagination(pagination + 1)}
                  >
                    {t.next}
                    <ChevronRight size={15} />
                  </Button>
                </div>
              </div>
            </section>
          )}
          {page === "budgets" &&
            (budgetItems.length ? (
              <>
                <div className="budget-summary">
                  <span>
                    {t.actual}: <b>{money(sum.expenses)}</b>
                  </span>
                  <span>
                    {t.totalBudget}:{" "}
                    <b>
                      {budgetItems.find((b) => !b.categoryId)
                        ? money(budgetItems.find((b) => !b.categoryId)!.amount)
                        : "—"}
                    </b>
                  </span>
                </div>
                <div className="cards-grid">
                  {budgetItems.map((b) => budgetCard(b))}
                </div>
              </>
            ) : (
              <section className="panel">
                {empty()}
                <Button onClick={() => open("budgets")}>{t.newBudget}</Button>
              </section>
            ))}
          {page === "goals" &&
            (data.goals.length ? (
              <div className="cards-grid">
                {data.goals.map((g) => goalCard(g))}
              </div>
            ) : (
              <section className="panel">
                {empty()}
                <Button onClick={() => open("goals")}>{t.newGoal}</Button>
              </section>
            ))}
          {page === "accounts" && (
            <div className="cards-grid">
              {data.accounts.map((a, i) => {
                const s = totals(
                  data.transactions.filter((x) => x.accountId === a.id),
                );
                return (
                  <section
                    className={"panel account-card account-" + (i % 3)}
                    key={a.id}
                  >
                    <div className="split">
                      <Landmark size={25} />
                      {actions("accounts", a)}
                    </div>
                    <h3>{a.name}</h3>
                    <span className="small muted">{t.balance}</span>
                    <strong className="account-balance">
                      {money(a.openingBalance + s.income - s.expenses)}
                    </strong>
                    <div className="account-footer">
                      <span>
                        {a.kind === "BANK"
                          ? t.bank
                          : a.kind === "CASH"
                            ? t.cash
                            : a.kind === "EWALLET"
                              ? t.ewallet
                              : t.savingsAccount}
                      </span>
                      <span>VND</span>
                    </div>
                  </section>
                );
              })}
              <button className="new-card" onClick={() => open("accounts")}>
                <Plus size={26} />
                {t.newAccount}
              </button>
            </div>
          )}
          {page === "recurring" && (
            <section className="panel">
              <div className="panel-title">
                <h3>{t.recurring}</h3>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api("finance/process-recurring", "POST", {});
                      await refresh();
                      toast.success(t.noDue);
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Repeat size={16} />
                  {t.process}
                </Button>
              </div>
              {!data.recurring.length ? (
                empty()
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.transactions}</th>
                        <th>{t.amount}</th>
                        <th>{t.nextDate}</th>
                        <th>{t.interval}</th>
                        <th>{t.active}</th>
                        <th>{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recurring.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>
                              {r.note || category(r.categoryId)?.name}
                            </strong>
                            <small className="muted block">
                              {
                                data.accounts.find((a) => a.id === r.accountId)
                                  ?.name
                              }
                            </small>
                          </td>
                          <td className={r.type === "INCOME" ? "positive" : ""}>
                            {r.type === "INCOME" ? "+" : "−"}
                            {money(r.amount)}
                          </td>
                          <td>{dateLabel(r.nextDate)}</td>
                          <td>
                            {r.interval === "WEEKLY"
                              ? t.weekly
                              : r.interval === "YEARLY"
                                ? t.yearly
                                : t.monthly}
                          </td>
                          <td>
                            <span
                              className={"status " + (r.active ? "active" : "")}
                            >
                              {r.active ? t.active : t.paused}
                            </span>
                          </td>
                          <td>{actions("recurring", r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {page === "reports" && (
            <>
              <div className="report-controls">
                <div className="tabs">
                  {["week", "month", "year"].map((p) => (
                    <button
                      key={p}
                      className={period === p ? "active" : ""}
                      onClick={() => setPeriod(p)}
                    >
                      {t[p as "week" | "month" | "year"]}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  aria-label={t.period}
                  value={reportDay}
                  onChange={(e) =>
                    e.target.value && setReportDay(e.target.value)
                  }
                />
                <span className="muted small">
                  {dateLabel(reportDates.from)} — {dateLabel(reportDates.to)}
                </span>
                <Button variant="outline" onClick={exportReport}>
                  <Download size={16} />
                  {t.downloadReport}
                </Button>
              </div>
              <div className="stats-grid">
                {stat(
                  t.income,
                  reportSum.income,
                  <ArrowDownLeft size={18} />,
                  true,
                )}
                {stat(
                  t.expenses,
                  reportSum.expenses,
                  <ArrowUpRight size={18} />,
                )}
                {stat(
                  t.savings,
                  reportSum.income - reportSum.expenses,
                  <Sprout size={18} />,
                )}
                <div className="stat-card">
                  <div className="split">
                    <span>{t.rate}</span>
                    <Target size={18} />
                  </div>
                  <strong>
                    {reportSum.income
                      ? (
                          ((reportSum.income - reportSum.expenses) /
                            reportSum.income) *
                          100
                        ).toFixed(1) + "%"
                      : "—"}
                  </strong>
                  <small>
                    {reportSum.income ? `${t.savings} / ${t.income}` : t.empty}
                  </small>
                </div>
              </div>
              <div className="charts-grid">
                <section className="panel">
                  {panelTitle(t.distribution)}
                  {reportSum.expenses ? (
                    <SpendingChart
                      data={reportCategories}
                      total={reportSum.expenses}
                      format={money}
                    />
                  ) : (
                    empty()
                  )}
                </section>
                <section className="panel">
                  {panelTitle(t.insight)}
                  <div className="report-insight">
                    <Sprout size={32} />
                    <h2>
                      {reportEntries.length
                        ? reportSum.income >= reportSum.expenses
                          ? t.healthGood
                          : t.healthBad
                        : t.empty}
                    </h2>
                    <p>
                      {reportCategories.length
                        ? `${t.largest}: ${reportCategories[0].name} (${Math.round((reportCategories[0].value / reportSum.expenses) * 100)}%).`
                        : t.noExpenses}
                    </p>
                  </div>
                  {reportCategories.slice(0, 4).map((c) => (
                    <div className="report-category" key={c.name}>
                      <span>
                        <i style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <b>{money(c.value)}</b>
                    </div>
                  ))}
                </section>
              </div>
              <section className="panel transactions-panel">
                {panelTitle(t.transactions)}
                {transactionTable(reportEntries.slice(0, 10))}
                <div className="table-footer">
                  {reportEntries.length} {t.records}
                  <a
                    className="text-link"
                    href={
                      "/api/finance/export?from=" +
                      reportDates.from +
                      "&to=" +
                      reportDates.to
                    }
                  >
                    {t.export}
                    <Download size={15} />
                  </a>
                </div>
              </section>
            </>
          )}
          {page === "settings" && (
            <div className="settings-grid">
              <section className="panel">
                <h3>{t.preferences}</h3>
                <div className="setting-row">
                  <div>
                    <b>{t.language}</b>
                    <p>Tiếng Việt / English</p>
                  </div>
                  <select
                    aria-label={t.language}
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="setting-row">
                  <b>{t.appearance}</b>
                  <Button variant="outline" onClick={() => setDark(!dark)}>
                    {dark ? <Moon size={16} /> : <Sun size={16} />}{" "}
                    {dark ? t.dark : t.light}
                  </Button>
                </div>
                <div className="setting-row">
                  <b>{t.currency}</b>
                  <span>VND · Việt Nam Đồng</span>
                </div>
                <div className="setting-row">
                  <div>
                    <b>{t.profile}</b>
                    <p>
                      {user.name}
                      <br />
                      {user.email}
                    </p>
                  </div>
                  <ShieldCheck size={24} />
                </div>
                <p className="form-help">{t.securityNote}</p>
              </section>
              <section className="panel">
                {panelTitle(t.categories)}
                <Button variant="outline" onClick={() => open("categories")}>
                  <Plus size={16} />
                  {t.newCategory}
                </Button>
                <div className="category-list">
                  {data.categories.map((c) => (
                    <div className="setting-row" key={c.id}>
                      <span className="label-icon">
                        <i
                          className="category-dot"
                          style={{ background: c.color }}
                        />
                        <span>
                          <b>{c.name}</b>
                          <small className="muted block">
                            {c.type === "INCOME" ? t.income : t.expenses}
                          </small>
                        </span>
                      </span>
                      {actions("categories", c)}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              finora.{" "}
              <span className="muted">
                {lang === "vi"
                  ? "Mỗi ngày, một bước tiến."
                  : "A little progress, every day."}
              </span>
            </span>
            <span>
              <ShieldCheck size={13} />
              {t.secure}
            </span>
          </footer>
        </main>
      </div>
      {editor && (
        <RecordForm
          key={editor.resource + String(editor.record?.id ?? "new")}
          editor={editor}
          data={data}
          lang={lang}
          month={month}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => !v && !busy && setDeleting(null)}
        title={t.confirmDelete}
        description={t.deleteDetail}
      >
        <div className="dialog-footer">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            {t.cancel}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy ? t.loading : t.delete}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
