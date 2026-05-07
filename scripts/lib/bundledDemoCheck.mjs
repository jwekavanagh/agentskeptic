/**
 * Bundled demo DB seed + canonical `agentskeptic check` invocations (examples/* fixtures).
 * Used by scripts/demo.mjs and contract tests so `npm start` matches asserted CLI stderr.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const seedPath = join(root, "examples", "seed.sql");
export const bundledDemoPaths = Object.freeze({
  root,
  seedPath,
  eventsPath: join(root, "examples", "events.ndjson"),
  registryPath: join(root, "examples", "tools.json"),
  dbPath: join(root, "examples", "demo.db"),
  cli: join(root, "dist", "cli.js"),
});

/**
 * Seeds examples/demo.db from examples/seed.sql (recreates DB if present).
 */
export function prepareBundledDemoDb() {
  const { seedPath: sp, dbPath } = bundledDemoPaths;
  const seedSql = readFileSync(sp, "utf8");
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  const db = new DatabaseSync(dbPath);
  db.exec(seedSql);
  db.close();
}

/**
 * @param {string} workflowId
 * @param {import("node:child_process").StdioOptions} [stdio]
 */
export function runBundledTruthCheck(workflowId, stdio = "inherit") {
  const { root: r, eventsPath, registryPath, dbPath, cli } = bundledDemoPaths;
  return spawnSync(
    process.execPath,
    [
      cli,
      "check",
      "--workflow-id",
      workflowId,
      "--events",
      eventsPath,
      "--registry",
      registryPath,
      "--db",
      dbPath,
    ],
    { cwd: r, stdio, env: process.env },
  );
}
