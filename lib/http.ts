import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  if (e instanceof ZodError)
    return json(
      { error: "INVALID_INPUT", fields: e.issues.map((i) => i.path.join(".")) },
      400,
    );
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return json({ error: "ALREADY_EXISTS" }, 409);
    if (e.code === "P2003") return json({ error: "RECORD_IN_USE" }, 409);
    if (e.code === "P2025") return json({ error: "NOT_FOUND" }, 404);
    if (e.code === "P2034") return json({ error: "PLEASE_RETRY" }, 409);
  }
  return json({ error: "SERVICE_UNAVAILABLE" }, 503);
}
export function checkOrigin(req: Request) {
  const origin = process.env.APP_ORIGIN;
  if (!origin) throw new HttpError(503, "CONFIGURATION_REQUIRED");
  if (req.headers.get("origin") !== new URL(origin).origin)
    throw new HttpError(403, "INVALID_ORIGIN");
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON_REQUIRED");
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length")) > 16384)
    throw new HttpError(413, "BODY_TOO_LARGE");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_INPUT");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new HttpError(413, "BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_INPUT");
  }
}
