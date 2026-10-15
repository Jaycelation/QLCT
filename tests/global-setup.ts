import { execSync } from "node:child_process";

/** Applies migrations to a dedicated test database (created if missing). Tests clean up their own rows. */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/finance_app_test?schema=public";
  if (!/test/i.test(url)) throw new Error("Refusing to run tests against a database whose name does not contain 'test'.");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "pipe",
  });
}
