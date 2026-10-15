// Disposable PostgreSQL-compatible databases for isolated local testing.
// Production and CI use PostgreSQL; this socket never listens externally.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
const suites = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["tests/integration.test.ts", "tests/auth.test.ts"];
for (const suite of suites) {
  const db = await PGlite.create();
  await db.exec(
    readFileSync("prisma/migrations/20261015000000_init/migration.sql", "utf8"),
  );
  const server = new PGLiteSocketServer({ db, port: 55434, host: "127.0.0.1" });
  await server.start();
  const code = await new Promise((resolve, reject) => {
    const child = spawn("npx", ["vitest", "run", suite], {
      stdio: "inherit",
      env: {
        ...process.env,
        RUN_INTEGRATION: "1",
        DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:55434/postgres?connection_limit=1",
      },
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  await server.stop();
  await db.close();
  if (code !== 0) process.exit(Number(code) || 1);
}
