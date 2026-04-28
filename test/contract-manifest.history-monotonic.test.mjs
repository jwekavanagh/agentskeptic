/**
 * Adversarial: history must be strictly ascending semver. Duplicates and
 * regressions both fail with CONTRACT_MANIFEST_HISTORY_NONMONOTONIC.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const scriptPath = join(root, "scripts", "contract-manifest.mjs");

function buildFixture() {
  const dir = mkdtempSync(join(tmpdir(), "as-contract-manifest-hist-"));
  cpSync(join(root, "schemas"), join(dir, "schemas"), { recursive: true });
  mkdirSync(join(dir, "examples"));
  copyFileSync(join(root, "examples", "tools.json"), join(dir, "examples", "tools.json"));
  copyFileSync(
    join(root, "examples", "events.ndjson"),
    join(dir, "examples", "events.ndjson"),
  );
  copyFileSync(join(root, "package.json"), join(dir, "package.json"));
  return dir;
}

function check(dir) {
  return spawnSync(process.execPath, [scriptPath, "--check"], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
}

test("duplicate manifestVersion in history fails CONTRACT_MANIFEST_HISTORY_NONMONOTONIC", () => {
  const dir = buildFixture();
  const manifestPath = join(dir, "schemas", "contract", "v1.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.history.push({ ...manifest.history[manifest.history.length - 1] });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const r = check(dir);
  assert.equal(r.status, 4, `stderr=\n${r.stderr}`);
  assert.match(r.stderr, /CONTRACT_MANIFEST_HISTORY_NONMONOTONIC/);
});

test("descending manifestVersion in history fails CONTRACT_MANIFEST_HISTORY_NONMONOTONIC", () => {
  const dir = buildFixture();
  const manifestPath = join(dir, "schemas", "contract", "v1.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const head = manifest.history[manifest.history.length - 1];
  manifest.history.push({
    ...head,
    manifestVersion: "0.9.0",
  });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const r = check(dir);
  assert.equal(r.status, 4);
  assert.match(r.stderr, /CONTRACT_MANIFEST_HISTORY_NONMONOTONIC/);
});
