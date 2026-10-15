/**
 * Maintenance job for cron or a scheduler: `pnpm jobs:run`.
 * Runs with the `react-server` condition so the `server-only` guard in src/server allows it.
 */
import { prisma } from "@/lib/db";
import { runMaintenance } from "@/server/jobs";

async function main() {
  try {
    const result = await runMaintenance();
    console.log(
      `Maintenance done: ${result.transactionsCreated} recurring transactions for ${result.users} users, ` +
        `${result.sessionsPurged} expired sessions and ${result.rateLimitsPurged} rate-limit windows removed.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Maintenance job failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
