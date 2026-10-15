"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, LOCALES } from "@/lib/constants";
import { passwordChangeSchema, profileSchema } from "@/lib/validation";
import { getCurrentSession } from "@/server/auth/current-user";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { invalidateUserSessions } from "@/server/auth/session";
import { authedAction } from "@/server/action-utils";
import { ConflictError } from "@/server/errors";

const localeSchema = z.enum(LOCALES);

/** Works signed in or out: always sets the cookie, and also saves the preference for signed-in users. */
export async function setLocaleAction(locale: unknown) {
  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) return { ok: false as const, error: "validation" };
  const store = await cookies();
  store.set(LOCALE_COOKIE, parsed.data, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  const session = await getCurrentSession();
  if (session) await prisma.user.update({ where: { id: session.user.id }, data: { locale: parsed.data } });
  revalidatePath("/", "layout");
  return { ok: true as const, data: undefined };
}

export async function updateProfileAction(input: unknown) {
  return authedAction(profileSchema, input, async (user, data) => {
    await prisma.user.update({ where: { id: user.id }, data: { name: data.name } });
    revalidatePath("/", "layout");
  });
}

export async function changePasswordAction(input: unknown) {
  return authedAction(passwordChangeSchema, input, async (user, data) => {
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(data.currentPassword, record.passwordHash))) throw new ConflictError("wrongPassword");
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.newPassword) } });
    // Sign out every other device.
    const session = await getCurrentSession();
    await invalidateUserSessions(user.id, session?.sessionId);
  });
}
