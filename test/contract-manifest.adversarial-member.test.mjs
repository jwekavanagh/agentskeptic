/**
 * Adversarial: editing a member file without --bump must fail the gate with
 * CONTRACT_MANIFEST_VERSION_NOT_BUMPED. We mirror the manifest, members,
 * examples, and package.json into a temp tree and mutate one byte.
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
  const dir = mkdtempSync(join(tmpdir(), "as-contract-manifest-"));
  // Mirror the minimal layout the gate inspects.
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

test("baseline temp fixture passes --check", () => {
  const dir = buildFixture();
  const r = spawnSync(process.execPath, [scriptPath, "--check"], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `expected baseline ok; stderr=\n${r.stderr}`);
});

test("editing a member file without --bump fails with CONTRACT_MANIFEST_VERSION_NOT_BUMPED (exit 1)", () => {
  const dir = buildFixture();
  const memberPath = join(dir, "schemas", "event.schema.json");
  const original = readFileSync(memberPath, "utf8");
  // Append a harmless whitespace byte so the schema is still valid JSON but the
  // bytes (and therefore the SHA-256) differ from the manifest's snapshot.
  writeFileSync(memberPath, original + "\n", "utf8");

  const r = spawnSync(process.execPath, [scriptPath, "--check"], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
  assert.equal(r.status, 1, `expected exit 1; got ${r.status}; stderr=\n${r.stderr}`);
  assert.match(r.stderr, /CONTRACT_MANIFEST_VERSION_NOT_BUMPED/);
  assert.match(r.stderr, /members\.event/);
});

test("editing an example file without --bump fails with CONTRACT_MANIFEST_VERSION_NOT_BUMPED", () => {
  const dir = buildFixture();
  const examplePath = join(dir, "examples", "events.ndjson");
  const original = readFileSync(examplePath, "utf8");
  writeFileSync(examplePath, original + "\n", "utf8");

  const r = spawnSync(process.execPath, [scriptPath, "--check"], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CONTRACT_MANIFEST_VERSION_NOT_BUMPED/);
  assert.match(r.stderr, /examples\.events/);
});
