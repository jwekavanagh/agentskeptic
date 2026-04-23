import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // CLI integration tests spawn `node dist/cli.js`; default 5s is too tight on Windows under parallel load.
    testTimeout: 20_000,
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["**/*.sqlite.test.mjs", "**/node_modules/**"],
  },
});
