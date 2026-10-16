import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/finance_app_test?schema=public";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; tests run server code directly.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DB, APP_TIMEZONE: "Asia/Ho_Chi_Minh" },
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
