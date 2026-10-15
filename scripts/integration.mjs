import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/integration.test.ts",
    "tests/auth.test.ts",
  ],
  { stdio: "inherit", env: { ...process.env, RUN_INTEGRATION: "1" } },
);
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => process.exit(1));
