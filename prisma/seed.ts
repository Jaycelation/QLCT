/**
 * Realistic demo data for local development.
 *   Demo login: demo@example.com / Demo@12345
 * Re-running the seed wipes and recreates only the demo user's data.
 */
import { PrismaClient, type PaymentMethod, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../src/lib/constants";
import { addDays, addMonths, formatDateOnly, startOfMonth, today, utcDate } from "../src/lib/dates";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Demo@12345";

// Deterministic PRNG so every seed produces the same dataset.
let state = 20261015;
function rand() {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number, step = 1000) => Math.round((min + rand() * (max - min)) / step) * step;

interface ExpenseTemplate {
  key: string;
  perMonth: [number, number];
  amount: [number, number];
  notes: string[];
  methods: PaymentMethod[];
  account: "cash" | "bank" | "wallet" | "card";
}

const EXPENSES: ExpenseTemplate[] = [
  { key: "food", perMonth: [22, 30], amount: [35_000, 180_000], notes: ["Cơm trưa văn phòng", "Phở bò", "Bún chả", "Cà phê sáng", "Trà sữa", "Đi chợ", "Bánh mì", "Ăn tối cùng bạn bè", "Siêu thị WinMart"], methods: ["CASH", "E_WALLET"], account: "wallet" },
  { key: "transport", perMonth: [8, 12], amount: [25_000, 120_000], notes: ["Grab đi làm", "Đổ xăng", "Gửi xe", "Be bike", "Rửa xe"], methods: ["E_WALLET", "CASH"], account: "wallet" },
  { key: "shopping", perMonth: [2, 5], amount: [150_000, 1_200_000], notes: ["Shopee", "Lazada", "Quần áo Uniqlo", "Đồ gia dụng", "Giày thể thao", "Tiki sách"], methods: ["CREDIT_CARD", "E_WALLET"], account: "card" },
  { key: "entertainment", perMonth: [2, 4], amount: [90_000, 450_000], notes: ["Xem phim CGV", "Netflix", "Spotify", "Karaoke", "Cafe cuối tuần"], methods: ["CREDIT_CARD", "E_WALLET", "CASH"], account: "card" },
  { key: "healthcare", perMonth: [0, 2], amount: [80_000, 600_000], notes: ["Thuốc cảm", "Khám răng", "Vitamin", "Khám tổng quát"], methods: ["CASH", "DEBIT_CARD"], account: "bank" },
  { key: "education", perMonth: [0, 1], amount: [200_000, 1_500_000], notes: ["Khóa học Udemy", "Sách chuyên môn", "Học tiếng Anh"], methods: ["DEBIT_CARD", "BANK_TRANSFER"], account: "bank" },
  { key: "family", perMonth: [0, 2], amount: [300_000, 1_500_000], notes: ["Biếu bố mẹ", "Quà sinh nhật", "Đám cưới bạn"], methods: ["CASH", "BANK_TRANSFER"], account: "cash" },
];

async function main() {
  const now = today();
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: "Nguyễn Minh Anh", passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12) },
  });
  const userId = user.id;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ userId, key: c.key, name: c.name, type: c.type, icon: c.icon, color: c.color })),
  });
  await prisma.category.create({
    data: { userId, name: "Thú cưng", type: "EXPENSE", icon: "paw-print", color: "#a855f7" },
  });
  const categories = await prisma.category.findMany({ where: { userId } });
  const cat = (key: string) => categories.find((c) => c.key === key)!;
  const pet = categories.find((c) => c.name === "Thú cưng")!;

  const [cash, bank, wallet, card] = await Promise.all([
    prisma.account.create({ data: { userId, name: "Tiền mặt", type: "CASH", initialBalance: 2_000_000n, color: "#10b981" } }),
    prisma.account.create({ data: { userId, name: "Vietcombank", type: "BANK", initialBalance: 45_000_000n, color: "#0ea5e9" } }),
    prisma.account.create({ data: { userId, name: "Ví MoMo", type: "E_WALLET", initialBalance: 500_000n, color: "#ec4899" } }),
    prisma.account.create({ data: { userId, name: "Thẻ tín dụng VIB", type: "CREDIT_CARD", initialBalance: 0n, color: "#f97316" } }),
  ]);
  const accountFor = { cash, bank, wallet, card } as const;

  // Recurring rules; their past occurrences are generated below as linked transactions.
  const firstMonth = addMonths(startOfMonth(now), -11);
  const salaryRule = await prisma.recurringTransaction.create({
    data: { userId, type: "INCOME", amount: 25_000_000n, accountId: bank.id, categoryId: cat("salary").id, paymentMethod: "BANK_TRANSFER", note: "Lương tháng", frequency: "MONTHLY", interval: 1, startDate: addDays(firstMonth, 4), nextRunDate: addDays(firstMonth, 4) },
  });
  const rentRule = await prisma.recurringTransaction.create({
    data: { userId, type: "EXPENSE", amount: 6_500_000n, accountId: bank.id, categoryId: cat("housing").id, paymentMethod: "BANK_TRANSFER", note: "Tiền thuê nhà", frequency: "MONTHLY", interval: 1, startDate: addDays(firstMonth, 1), nextRunDate: addDays(firstMonth, 1) },
  });
  const internetRule = await prisma.recurringTransaction.create({
    data: { userId, type: "EXPENSE", amount: 220_000n, accountId: bank.id, categoryId: cat("bills").id, paymentMethod: "BANK_TRANSFER", note: "Internet FPT", frequency: "MONTHLY", interval: 1, startDate: addDays(firstMonth, 9), nextRunDate: addDays(firstMonth, 9) },
  });
  await prisma.recurringTransaction.create({
    data: { userId, type: "EXPENSE", amount: 1_200_000n, accountId: card.id, categoryId: cat("healthcare").id, paymentMethod: "CREDIT_CARD", note: "Phòng gym (quý)", frequency: "MONTHLY", interval: 3, startDate: addDays(startOfMonth(now), 14), nextRunDate: addDays(startOfMonth(now), 14) },
  });

  const rows: Prisma.TransactionCreateManyInput[] = [];
  const push = (r: Omit<Prisma.TransactionCreateManyInput, "userId"> & { date: Date }) => {
    if (r.date <= now) rows.push({ userId, ...r });
  };

  for (let m = 0; m < 12; m++) {
    const month = addMonths(firstMonth, m);
    const daysInMonth = addMonths(month, 1).getTime() - month.getTime();
    const dayCount = Math.round(daysInMonth / 86_400_000);
    const day = (d: number) => utcDate(month.getUTCFullYear(), month.getUTCMonth(), Math.min(d, dayCount));

    push({ type: "INCOME", amount: 25_000_000n, date: day(5), accountId: bank.id, categoryId: cat("salary").id, paymentMethod: "BANK_TRANSFER", note: "Lương tháng", recurringId: salaryRule.id });
    push({ type: "EXPENSE", amount: 6_500_000n, date: day(2), accountId: bank.id, categoryId: cat("housing").id, paymentMethod: "BANK_TRANSFER", note: "Tiền thuê nhà", recurringId: rentRule.id });
    push({ type: "EXPENSE", amount: 220_000n, date: day(10), accountId: bank.id, categoryId: cat("bills").id, paymentMethod: "BANK_TRANSFER", note: "Internet FPT", recurringId: internetRule.id });
    push({ type: "EXPENSE", amount: BigInt(between(550_000, 1_100_000)), date: day(12), accountId: bank.id, categoryId: cat("bills").id, paymentMethod: "BANK_TRANSFER", note: "Tiền điện EVN" });
    push({ type: "EXPENSE", amount: BigInt(between(90_000, 160_000)), date: day(12), accountId: bank.id, categoryId: cat("bills").id, paymentMethod: "BANK_TRANSFER", note: "Tiền nước" });
    push({ type: "EXPENSE", amount: BigInt(between(400_000, 900_000)), date: day(15), accountId: wallet.id, categoryId: pet.id, paymentMethod: "E_WALLET", note: "Thức ăn cho mèo" });

    if (rand() < 0.6) push({ type: "INCOME", amount: BigInt(between(1_500_000, 6_000_000, 100_000)), date: day(between(10, 26, 1)), accountId: bank.id, categoryId: cat("side_income").id, paymentMethod: "BANK_TRANSFER", note: pick(["Dự án freelance", "Viết bài", "Dạy kèm"]) });
    if (m % 3 === 2) push({ type: "INCOME", amount: BigInt(between(300_000, 1_200_000, 10_000)), date: day(25), accountId: bank.id, categoryId: cat("investment").id, paymentMethod: "BANK_TRANSFER", note: "Lãi tiết kiệm / cổ tức" });
    if (month.getUTCMonth() === 0) push({ type: "INCOME", amount: 30_000_000n, date: day(20), accountId: bank.id, categoryId: cat("bonus").id, paymentMethod: "BANK_TRANSFER", note: "Thưởng Tết" });

    for (const tpl of EXPENSES) {
      const count = between(tpl.perMonth[0], tpl.perMonth[1], 1);
      for (let i = 0; i < count; i++) {
        push({
          type: "EXPENSE",
          amount: BigInt(between(tpl.amount[0], tpl.amount[1])),
          date: day(between(1, dayCount, 1)),
          accountId: accountFor[tpl.account].id,
          categoryId: cat(tpl.key).id,
          paymentMethod: pick(tpl.methods),
          note: pick(tpl.notes),
        });
      }
    }
  }
  await prisma.transaction.createMany({ data: rows });

  // Advance rule cursors past the generated history.
  for (const rule of [salaryRule, rentRule, internetRule]) {
    let next = rule.startDate;
    while (next <= now) next = addMonths(next, 1, rule.startDate.getUTCDate());
    await prisma.recurringTransaction.update({ where: { id: rule.id }, data: { nextRunDate: next } });
  }

  await prisma.budget.createMany({
    data: [
      { userId, categoryId: null, amount: 15_000_000n, alertThreshold: 85 },
      { userId, categoryId: cat("food").id, amount: 3_000_000n, alertThreshold: 80 },
      { userId, categoryId: cat("shopping").id, amount: 2_000_000n, alertThreshold: 80 },
      { userId, categoryId: cat("entertainment").id, amount: 800_000n, alertThreshold: 75 },
      { userId, categoryId: cat("transport").id, amount: 900_000n, alertThreshold: 80 },
      { userId, categoryId: cat("bills").id, amount: 1_800_000n, alertThreshold: 90 },
    ],
  });

  const goals = [
    { name: "Quỹ khẩn cấp", target: 60_000_000, deadline: addMonths(now, 8), color: "#10b981", icon: "landmark", monthly: 3_000_000 },
    { name: "Du lịch Nhật Bản", target: 40_000_000, deadline: addMonths(now, 5), color: "#ec4899", icon: "plane", monthly: 2_500_000 },
    { name: "Laptop mới", target: 25_000_000, deadline: addMonths(now, -1), color: "#6366f1", icon: "smartphone", monthly: 2_600_000 },
  ];
  for (const g of goals) {
    const goal = await prisma.savingsGoal.create({
      data: { userId, name: g.name, targetAmount: BigInt(g.target), deadline: g.deadline, color: g.color, icon: g.icon },
    });
    let saved = 0;
    for (let m = 0; m < 10 && saved < g.target; m++) {
      const amount = Math.min(g.monthly, g.target - saved);
      saved += amount;
      await prisma.goalContribution.create({
        data: { goalId: goal.id, amount: BigInt(amount), date: addDays(addMonths(firstMonth, m + 2), 6), note: "Trích lương" },
      });
    }
    if (saved >= g.target) await prisma.savingsGoal.update({ where: { id: goal.id }, data: { status: "COMPLETED" } });
  }

  console.log(`Seeded ${rows.length} transactions for ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}) up to ${formatDateOnly(now)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
