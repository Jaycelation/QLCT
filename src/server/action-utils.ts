import "server-only";
import { Prisma } from "@prisma/client";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { fieldErrors, type FieldErrors } from "@/lib/validation";
import { requireUser } from "./auth/current-user";
import type { SessionUser } from "./auth/session";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/** Maps known failures to i18n error keys. Unknown errors are logged server-side without user data. */
export function toActionError(error: unknown): { ok: false; error: string; fieldErrors?: FieldErrors } {
  if (error instanceof ValidationError) return { ok: false, error: "validation", fieldErrors: error.fieldErrors };
  if (error instanceof NotFoundError) return { ok: false, error: "notFound" };
  if (error instanceof ConflictError) return { ok: false, error: error.code };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, error: "duplicate" };
    if (error.code === "P2003" || error.code === "P2014") return { ok: false, error: "inUse" };
    if (error.code === "P2025") return { ok: false, error: "notFound" };
  }
  console.error("[action] unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : "unknown");
  return { ok: false, error: "unexpected" };
}

/**
 * Standard server-action pipeline: authenticate, validate with Zod, run, map errors.
 * The user id always comes from the session, never from client input.
 */
export async function authedAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  fn: (user: SessionUser, data: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation", fieldErrors: fieldErrors(parsed.error) };
  try {
    return { ok: true, data: await fn(user, parsed.data) };
  } catch (error) {
    unstable_rethrow(error);
    return toActionError(error);
  }
}
