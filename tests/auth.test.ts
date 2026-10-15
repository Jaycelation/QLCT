import { describe, it, expect, vi, afterAll, beforeAll } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
    delete: (key: string) => jar.delete(key),
  }),
}));
import { POST, GET } from "../app/api/auth/[action]/route";
import { GET as financeGET } from "../app/api/finance/[[...path]]/route";
import { db } from "../lib/db";
import { hashToken, rateLimit } from "../lib/auth";
const run = process.env.RUN_INTEGRATION === "1" ? describe : describe.skip;
run("authentication and protected routes", () => {
  const email = `auth-${Date.now()}@test.local`;
  const password = "Secure-test-password-2026!";
  let userId: string;
  let token: string;
  beforeAll(() => {
    process.env.APP_ORIGIN = "http://localhost:3000";
  });
  const post = (
    action: string,
    value: unknown,
    origin = "http://localhost:3000",
  ) =>
    POST(
      new Request("http://localhost:3000/api/auth/" + action, {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify(value),
      }),
      { params: Promise.resolve({ action }) },
    );
  afterAll(async () => {
    if (userId) {
      await db.category.deleteMany({ where: { userId } });
      await db.account.deleteMany({ where: { userId } });
      await db.user.delete({ where: { id: userId } });
    }
    await db.rateLimit.deleteMany({
      where: {
        key: {
          in: [
            hashToken("auth:" + email),
            hashToken("auth-global"),
            hashToken("rate-limit-test"),
          ],
        },
      },
    });
    await db.$disconnect();
  });
  it("returns 401 for unauthenticated financial reads", async () => {
    const res = await financeGET(
      new Request("http://localhost:3000/api/finance"),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(401);
  });
  it("rejects cross-origin registration", async () => {
    expect(
      (
        await post(
          "register",
          { email, password, name: "Test" },
          "https://attacker.example",
        )
      ).status,
    ).toBe(403);
  });
  it("registers with hashed password and opaque server session", async () => {
    expect(
      (await post("register", { email, password, name: "Test" })).status,
    ).toBe(201);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    userId = user.id;
    expect(user.passwordHash).not.toBe(password);
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    token = [...jar.values()][0];
    expect(token.length).toBeGreaterThan(40);
    expect(
      (await db.session.findUnique({ where: { id: hashToken(token) } }))
        ?.userId,
    ).toBe(userId);
    const me = await (await GET()).json();
    expect(me.user.email).toBe(email);
    expect(me.user.passwordHash).toBeUndefined();
  });
  it("revokes session on logout", async () => {
    expect((await post("logout", {})).status).toBe(200);
    expect(
      await db.session.findUnique({ where: { id: hashToken(token) } }),
    ).toBeNull();
    expect((await (await GET()).json()).user).toBeNull();
  });
  it("rejects wrong password and accepts correct one", async () => {
    expect(
      (await post("login", { email, password: "wrong-password-value" })).status,
    ).toBe(401);
    expect((await post("login", { email, password })).status).toBe(200);
  });
  it("rejects expired sessions", async () => {
    const current = [...jar.values()][0];
    await db.session.update({
      where: { id: hashToken(current) },
      data: { expiresAt: new Date(0) },
    });
    expect((await (await GET()).json()).user).toBeNull();
    jar.clear();
  });
  it("enforces persistent rate limits", async () => {
    await rateLimit("rate-limit-test", 1);
    await expect(rateLimit("rate-limit-test", 1)).rejects.toThrow(
      "TOO_MANY_ATTEMPTS",
    );
  });
});
