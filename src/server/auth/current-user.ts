import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/constants";
import { validateSessionToken, type SessionUser } from "./session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_DAYS * 86_400,
};

/** Resolves the signed-in user once per request. Returns null when there is no valid session. */
export const getCurrentSession = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getCurrentSession())?.user ?? null;
}

/** Use at the top of every protected page, layout, server action and route handler. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
