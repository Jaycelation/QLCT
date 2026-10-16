import { prisma } from "@/lib/db";

/** Liveness/readiness probe for deployments. Exposes no data. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
