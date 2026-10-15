import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { createSession, hashToken } from "@/server/auth/session";
import { runMaintenance } from "@/server/jobs";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { createRecurring } from "@/server/recurring";
import { createUser, resetDb } from "../helpers";

const day = (s: string) => parseDateOnly(s)!;

beforeEach(async () => {
  await resetDb();
  await prisma.rateLimit.deleteMany();
});
afterAll(async () => {
  await resetDb();
  await prisma.rateLimit.deleteMany();
  await prisma.$disconnect();
});

describe("database rate limiter", () => {
  const t0 = new Date("2026-10-15T10:00:00Z");

  it("allows up to the limit, then blocks until the window ends", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("login-email:a@b.c", 3, 60_000, t0)).ok).toBe(true);
    const blocked = await rateLimit("login-email:a@b.c", 3, 60_000, new Date(t0.getTime() + 10_000));
    expect(blocked).toEqual({ ok: false, retryAfterMs: 50_000 });
    expect((await rateLimit("login-email:a@b.c", 3, 60_000, new Date(t0.getTime() + 60_000))).ok).toBe(true);
  });

  it("keeps keys independent, stores them hashed and can be reset", async () => {
    await rateLimit("login-email:x@y.z", 1, 60_000, t0);
    expect((await rateLimit("login-email:x@y.z", 1, 60_000, t0)).ok).toBe(false);
    expect((await rateLimit("login-ip:1.2.3.4", 1, 60_000, t0)).ok).toBe(true);
    const keys = (await prisma.rateLimit.findMany()).map((r) => r.key);
    expect(keys.every((k) => /^[0-9a-f]{64}$/.test(k))).toBe(true);
    await resetRateLimit("login-email:x@y.z");
    expect((await rateLimit("login-email:x@y.z", 1, 60_000, t0)).ok).toBe(true);
  });

  it("counts concurrent attempts exactly", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => rateLimit("burst", 4, 60_000, t0)));
    expect(results.filter((r) => r.ok)).toHaveLength(4);
  });
});

describe("maintenance job", () => {
  it("books due recurring transactions for every user idempotently and purges expired rows", async () => {
    const a = await createUser("A");
    const b = await createUser("B");
    for (const f of [a, b]) {
      await createRecurring(
        f.user.id,
        {
          type: "EXPENSE",
          amount: 100_000,
          accountId: f.account.id,
          categoryId: f.food.id,
          paymentMethod: "CASH",
          frequency: "MONTHLY",
          interval: 1,
          startDate: day("2026-09-01"),
          endDate: null,
        },
        day("2026-08-01"),
      );
    }
    const { token } = await createSession(a.user.id);
    await prisma.session.update({ where: { id: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await rateLimit("old", 5, 1000, new Date(Date.now() - 10_000));

    const first = await runMaintenance(new Date(), day("2026-10-15"));
    expect(first).toEqual({ users: 2, transactionsCreated: 4, sessionsPurged: 1, rateLimitsPurged: 1 });
    expect(await prisma.transaction.count({ where: { userId: a.user.id } })).toBe(2);
    expect(await prisma.transaction.count({ where: { userId: b.user.id } })).toBe(2);

    const second = await runMaintenance(new Date(), day("2026-10-15"));
    expect(second).toEqual({ users: 0, transactionsCreated: 0, sessionsPurged: 0, rateLimitsPurged: 0 });
  });
});
