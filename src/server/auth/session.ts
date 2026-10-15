import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { SESSION_TTL_DAYS } from "@/lib/constants";

const DAY_MS = 86_400_000;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  locale: "vi" | "en";
  currency: string;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * DAY_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/**
 * Looks up a session by its raw cookie token. Expired sessions are deleted.
 * Sessions past half their lifetime are extended (sliding expiry); `renewedExpiresAt`
 * tells the caller to refresh the cookie.
 */
export async function validateSessionToken(
  token: string,
): Promise<{ user: SessionUser; sessionId: string; renewedExpiresAt: Date | null } | null> {
  if (!token || token.length > 128) return null;
  const sessionId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, name: true, locale: true, currency: true } } },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    return null;
  }
  let renewedExpiresAt: Date | null = null;
  if (session.expiresAt.getTime() - now < (SESSION_TTL_DAYS * DAY_MS) / 2) {
    renewedExpiresAt = new Date(now + SESSION_TTL_DAYS * DAY_MS);
    await prisma.session.update({ where: { id: sessionId }, data: { expiresAt: renewedExpiresAt } });
  }
  return { user: session.user, sessionId, renewedExpiresAt };
}

export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}
