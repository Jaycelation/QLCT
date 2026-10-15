import { db } from "../lib/db";
import { processRecurring } from "../lib/service";
async function main() {
  try {
    const users = await db.user.findMany({ select: { id: true } });
    for (const u of users) await processRecurring(u.id);
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    console.log("Recurring processing completed.");
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("Recurring job failed; check server configuration.");
  process.exitCode = 1;
});
