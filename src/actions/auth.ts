"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, SESSION_COOKIE } from "@/lib/constants";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation";
import { setSessionCookie } from "@/server/auth/current-user";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { createSession, invalidateSession } from "@/server/auth/session";
import { provisionNewUser } from "@/server/categories";
import type { ActionResult } from "@/server/action-utils";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Only same-site relative paths are allowed as post-login destinations (prevents open redirects). */
function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}

export async function registerAction(input: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000).ok) return { ok: false, error: "rateLimited" };

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "emailTaken", fieldErrors: { email: "emailTaken" } };

  const store = await cookies();
  const locale = store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "vi";
  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name, email, passwordHash, locale } });
    await provisionNewUser(created.id, tx);
    return created;
  });

  const { token } = await createSession(user.id);
  await setSessionCookie(token);
  redirect("/dashboard");
}

export async function loginAction(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const ipLimit = rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
  const emailLimit = rateLimit(`login-email:${email}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok || !emailLimit.ok) return { ok: false, error: "rateLimited" };

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  // Same message for unknown email and wrong password, to avoid account enumeration.
  if (!user || !valid) return { ok: false, error: "invalidCredentials" };

  resetRateLimit(`login-email:${email}`);
  const { token } = await createSession(user.id);
  await setSessionCookie(token);
  const store = await cookies();
  store.set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  redirect(safeNext(next));
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await invalidateSession(token);
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
