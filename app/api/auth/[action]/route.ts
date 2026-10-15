import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { authSchema } from "@/lib/validation";
import { body, checkOrigin, failure, HttpError, json } from "@/lib/http";
import { createSession, currentUser, logout, rateLimit } from "@/lib/auth";
import { defaultCategories } from "@/lib/defaults";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ user: await currentUser() });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    checkOrigin(req);
    const { action } = await params;
    if (action === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (!["login", "register"].includes(action))
      throw new HttpError(404, "NOT_FOUND");
    const input = authSchema.parse(await body(req));
    await rateLimit("auth:" + input.email, 10);
    await rateLimit("auth-global", 1000);
    if (action === "register") {
      if (!input.name) throw new HttpError(400, "NAME_REQUIRED");
      const passwordHash = await hash(input.password, 12);
      const user = await db.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          accounts: {
            create: {
              name: "Tài khoản chính",
              kind: "BANK",
              openingBalance: 0,
            },
          },
          categories: {
            create: defaultCategories.map(([name, type, color]) => ({
              name,
              type,
              color,
            })),
          },
        },
      });
      await createSession(user.id);
      return json({ ok: true }, 201);
    }
    const user = await db.user.findUnique({ where: { email: input.email } });
    const valid = await compare(
      input.password,
      user?.passwordHash ??
        "$2b$12$0m83Rq7dC2QbcunTjEHBm.eGBvc0Zn0YPwJ8zLzp9FNArFzkgZCjm",
    );
    if (!user || !valid) throw new HttpError(401, "INVALID_CREDENTIALS");
    await logout();
    await createSession(user.id);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
