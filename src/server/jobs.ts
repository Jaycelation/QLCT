import "server-only";
import { prisma } from "@/lib/db";
import { today as todayDate } from "@/lib/dates";
import { purgeExpiredSessions } from "@/server/auth/session";
import { purgeExpiredRateLimits } from "@/server/rate-limit";
import { materializeDueRecurring } from "@/server/recurring";

export interface MaintenanceResult {
  users: number;
  transactionsCreated: number;
  sessionsPurged: number;
  rateLimitsPurged: number;
}

/**
 * Scheduled maintenance: books recurring transactions for every user who has some due (so reports
 * are current even for users who have not opened the app), then removes expired sessions and
 * rate-limit windows. Safe to run as often as you like; each step is idempotent.
 */
export async function runMaintenance(now = new Date(), today = todayDate()): Promise<MaintenanceResult> {
  const due = await prisma.recurringTransaction.findMany({
    where: { active: true, nextRunDate: { lte: today } },
    select: { userId: true },
    distinct: ["userId"],
  });
  let transactionsCreated = 0;
  for (const { userId } of due) transactionsCreated += await materializeDueRecurring(userId, today);
  return {
    users: due.length,
    transactionsCreated,
    sessionsPurged: await purgeExpiredSessions(now),
    rateLimitsPurged: await purgeExpiredRateLimits(now),
  };
}
