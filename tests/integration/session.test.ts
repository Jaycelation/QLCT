import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createSession, hashToken, invalidateSession, invalidateUserSessions, validateSessionToken } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createUser, resetDb } from "../helpers";

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

describe("sessions", () => {
  it("store only a hash of the token and resolve the user", async () => {
    const { user } = await createUser("Sess");
    const { token } = await createSession(user.id);
    expect(await prisma.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: hashToken(token) } })).not.toBeNull();
    const v = await validateSessionToken(token);
    expect(v?.user.id).toBe(user.id);
    expect(v?.user).not.toHaveProperty("passwordHash");
  });

  it("reject unknown, tampered and expired tokens", async () => {
    const { user } = await createUser("Sess");
    const { token } = await createSession(user.id);
    expect(await validateSessionToken("nope")).toBeNull();
    expect(await validateSessionToken(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"))).toBeNull();
    await prisma.session.update({ where: { id: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });

  it("extend sessions past half their lifetime", async () => {
    const { user } = await createUser("Sess");
    const { token } = await createSession(user.id);
    await prisma.session.update({ where: { id: hashToken(token) }, data: { expiresAt: new Date(Date.now() + 86_400_000) } });
    const v = await validateSessionToken(token);
    expect(v?.renewedExpiresAt?.getTime()).toBeGreaterThan(Date.now() + 20 * 86_400_000);
  });

  it("logout and password change invalidate sessions", async () => {
    const { user } = await createUser("Sess");
    const a = await createSession(user.id);
    const b = await createSession(user.id);
    await invalidateSession(a.token);
    expect(await validateSessionToken(a.token)).toBeNull();
    const c = await createSession(user.id);
    await invalidateUserSessions(user.id, hashToken(c.token));
    expect(await validateSessionToken(b.token)).toBeNull();
    expect(await validateSessionToken(c.token)).not.toBeNull();
  });
});

describe("passwords", () => {
  it("are hashed with bcrypt", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("Secret123", hash)).toBe(true);
    expect(await verifyPassword("secret123", hash)).toBe(false);
  });
});
