#!/usr/bin/env node
/**
 * Runs `npm run verify:web-marketing-copy` steps with `NEXT_PUBLIC_APP_URL` pinned to
 * `productionCanonicalOrigin` so `next build` inlines the same public URLs CI expects
 * (OpenAPI / marketing URL parity) even when `website/.env` uses loopback for dev.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const anchors = JSON.parse(
  readFileSync(path.join(root, "config", "marketing.json"), "utf8"),
);
const canonical = new URL(String(anchors.productionCanonicalOrigin).trim()).origin;

const env = { ...process.env, NEXT_PUBLIC_APP_URL: canonical };
if (env.NODE_OPTIONS == null || !String(env.NODE_OPTIONS).includes("max-old-space-size")) {
  env.NODE_OPTIONS =
    env.NODE_OPTIONS != null
      ? `${String(env.NODE_OPTIONS)} --max-old-space-size=8192`
      : "--max-old-space-size=8192";
}

function runNode(args, cwd = root) {
  const r = spawnSync(process.execPath, args, { cwd, env, stdio: "inherit", shell: false });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) process.exit(code);
}

function runShell(line, cwd = root) {
  const r = spawnSync(line, { cwd, env, stdio: "inherit", shell: true });
  if (r.error) {
    console.error(r.error);
    process.exit(1);
  }
  const code = r.status === null ? 1 : r.status;
  if (code !== 0) process.exit(code);
}

runNode([path.join(root, "scripts", "validate-discovery-acquisition.mjs")]);
runNode(["--test", path.join(root, "test", "visitor-problem-outcome.test.mjs")]);
runShell("npm run build:website");
runNode([path.join(root, "scripts", "run-website-vitest-with-reuse.mjs")]);
runNode([path.join(root, "scripts", "website-holistic-gate.mjs")]);
