#!/usr/bin/env node
/**
 * Legacy: @esbuild-kit/core-utils (pulled by older drizzle-kit) nested a vulnerable esbuild.
 * drizzle-kit 1.x no longer depends on @esbuild-kit; this script is a no-op when absent.
 * When the lockfile still contains `node_modules/@esbuild-kit/core-utils`, copies hoisted
 * `esbuild` / `@esbuild/*` entries into that nested tree so the lock matches patched installs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(root, "package-lock.json");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const { packages: pk } = lock;
if (!pk || typeof pk !== "object") {
  process.stderr.write("align-esbuild-kit-lock-nested: invalid package-lock (no packages)\n");
  process.exit(1);
}

const utilKey = "node_modules/@esbuild-kit/core-utils";
if (!pk[utilKey]) {
  process.stdout.write("align-esbuild-kit-lock-nested: no @esbuild-kit/core-utils in lockfile; skipping\n");
  process.exit(0);
}

const NESTED = "node_modules/@esbuild-kit/core-utils/node_modules";
const COPY_KEYS = new Set([
  "version",
  "resolved",
  "integrity",
  "dev",
  "license",
  "bin",
  "hasInstallScript",
  "engines",
  "cpu",
  "os",
  "optional",
  "funding",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
]);

let updated = 0;
for (const toKey of Object.keys(pk)) {
  if (!toKey.startsWith(`${NESTED}/`)) continue;
  const rel = toKey.slice(NESTED.length + 1);
  const fromKey = `node_modules/${rel}`;
  const src = pk[fromKey];
  const dest = pk[toKey];
  if (!src || !dest) continue;
  for (const k of COPY_KEYS) {
    if (k in src) dest[k] = src[k];
  }
  updated++;
}
if (pk[utilKey]?.dependencies) {
  pk[utilKey].dependencies.esbuild = "0.25.12";
}

writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
process.stdout.write(
  `align-esbuild-kit-lock-nested: updated ${String(updated)} nested entries; ${utilKey} esbuild=0.25.12\n`,
);
