#!/usr/bin/env node
/**
 * After @semantic-release/npm has written the new semver to root package.json, syncs:
 * - python/pyproject.toml
 * - website/package.json
 * - runs emit-primary-marketing (regenerates public distribution surfaces + root package fields)
 * - refreshes package-lock.json for the monorepo
 *
 * Invoked from semantic-release @semantic-release/exec prepareCmd (CI) or locally for testing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

const rootPkgPath = path.join(root, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
const ver = String(rootPkg.version ?? "").trim();
if (!ver) {
  console.error("sync-release-artifacts: root package.json missing version (run after semantic-release/npm prepare)");
  process.exit(1);
}

const pyPath = path.join(root, "python", "pyproject.toml");
let py = readFileSync(pyPath, "utf8");
if (!/^version\s*=\s*"[^"]*"/m.test(py)) {
  console.error("sync-release-artifacts: could not find [project] version in python/pyproject.toml");
  process.exit(1);
}
py = py.replace(/^version\s*=\s*"[^"]*"/m, `version = "${ver}"`);
writeFileSync(pyPath, py, "utf8");

const webPkgPath = path.join(root, "website", "package.json");
const webPkg = JSON.parse(readFileSync(webPkgPath, "utf8"));
webPkg.version = ver;
writeFileSync(webPkgPath, JSON.stringify(webPkg, null, 2) + "\n", "utf8");

execFileSync(node, [path.join(root, "scripts", "emit-primary-marketing.cjs")], { cwd: root, stdio: "inherit" });
execSync("npm install --package-lock-only --no-audit --no-fund", { cwd: root, stdio: "inherit" });
