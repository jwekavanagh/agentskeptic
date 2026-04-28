/**
 * Adversarial: hand-editing the manifest invalidates the seal. The gate
 * detects this either as HASH_STALE (canonical bytes drift) or
 * CONTRACT_MANIFEST_HASH_STALE (sealed sha256 drift).
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
  const dir = mkdtempSync(join(tmpdir(), "as-contract-manifest-edit-"));
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

test("flipping a digit in head.manifestSha256 fails with CONTRACT_MANIFEST_HASH_STALE", () => {
  const dir = buildFixture();
  const manifestPath = join(dir, "schemas", "contract", "v1.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const head = manifest.history[manifest.history.length - 1];
  // Replace one hex char with a different one (still valid 64-hex pattern).
  const sealed = head.manifestSha256;
  const flipped = (sealed[0] === "0" ? "1" : "0") + sealed.slice(1);
  manifest.history[manifest.history.length - 1].manifestSha256 = flipped;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const r = spawnSync(process.execPath, [scriptPath, "--check"], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
  assert.equal(r.status, 2, `expected exit 2; stderr=\n${r.stderr}`);
  assert.match(r.stderr, /CONTRACT_MANIFEST_HASH_STALE/);
});

test("hand-editing manifest publicUrl fails (HASH_STALE; recomputed hash diverges)", () => {
  const dir = buildFixture();
  const manifestPath = join(dir, "schemas", "contract", "v1.json");
  const original = readFileSync(manifestPath, "utf8");
  const mutated = original.replace(
    "https://agentskeptic.com/contract/v1.json",
    "https://example.invalid/contract/v1.json",
  );
  assert.notEqual(mutated, original, "fixture must include the canonical URL");
  writeFileSync(manifestPath, mutated, "utf8");

  const r = spawnSync(process.execPath, [scriptPath, "--check"], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /CONTRACT_MANIFEST_HASH_STALE/);
});
