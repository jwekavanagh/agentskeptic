#!/usr/bin/env node
/**
 * Fail-closed activation spine proof (activation_spine_prd).
 * Preflight: DATABASE_URL, TELEMETRY_DATABASE_URL, dist/cli.js, dist/telemetry/postProductActivationEvent.js.
 * Sets ACTIVATION_SPINE_VALIDATOR=1 for all children so DB suites cannot skip silently.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function fail(msg) {
  console.error(`validate-activation-spine: ${msg}`);
  process.exit(1);
}

for (const v of ["DATABASE_URL", "TELEMETRY_DATABASE_URL"]) {
  if (!process.env[v]?.trim()) {
    fail(`missing or empty ${v}`);
  }
}

for (const rel of ["dist/cli.js", "dist/telemetry/postProductActivationEvent.js"]) {
  const p = path.join(root, rel);
  if (!existsSync(p)) {
    fail(`missing file ${rel} (run npm run build at repo root)`);
  }
}

const childEnv = { ...process.env, ACTIVATION_SPINE_VALIDATOR: "1" };

function runNode(argv) {
  const r = spawnSync(process.execPath, argv, {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function runShell(line) {
  const r = spawnSync(line, {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

runShell("npm run check:integrate-activation-shell");
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/activation-spine-narrative-alignment.source.test.ts",
);
runShell("npx vitest run src/commercial/verifyWorkloadClassify.test.ts");
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/integrate-activation-guided-spine.integration.test.tsx",
);
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/integrate-activation-telemetry-off.integration.test.ts",
);
runNode(["--test", "test/integrate-spine-step3-chain.happy.test.mjs"]);
runNode(["--test", "test/integrate-spine-step3-chain.negative.test.mjs"]);
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/product-activation-reachability.integration.test.ts",
);
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/integrate-next-steps-surface.source.test.ts",
);
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/funnel-observability-epistemics.source.test.ts",
);
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/growth-metrics-qualified-kpi-epistemics.source.test.ts",
);
// Prewarm website .next; markup test + siteTestServer reuse the build (faster, avoids hook timeout)
runShell("npm run build -w agentskeptic-web");
childEnv.WEBSITE_TEST_REUSE_DIST = "1";
runShell(
  "npm run test:vitest -w agentskeptic-web -- __tests__/integrate-page-prerequisites.markup.test.ts",
);
