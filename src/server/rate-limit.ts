import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiter stored in PostgreSQL, so limits hold across restarts and across several
 * app instances. Keys are hashed so raw emails and IPs are never stored.
 */
export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

export async function rateLimit(key: string, limit: number, windowMs: number, now = new Date()): Promise<RateLimitResult> {
  const expires = new Date(now.getTime() + windowMs);
  // One atomic upsert: a new or expired window restarts at 1, otherwise the counter goes up.
  const rows = await prisma.$queryRaw<{ attempts: number; expiresAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "attempts", "expiresAt") VALUES (${hashKey(key)}, 1, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN 1 ELSE "RateLimit"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= ${now} THEN ${expires} ELSE "RateLimit"."expiresAt" END
    RETURNING "attempts", "expiresAt"`;
  const { attempts, expiresAt } = rows[0];
  if (attempts > limit) return { ok: false, retryAfterMs: Math.max(expiresAt.getTime() - now.getTime(), 0) };
  return { ok: true, retryAfterMs: 0 };
}

export async function resetRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key: hashKey(key) } });
}

export async function purgeExpiredRateLimits(now = new Date()) {
  const { count } = await prisma.rateLimit.deleteMany({ where: { expiresAt: { lte: now } } });
  return count;
}
