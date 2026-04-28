/**
 * --write refuses to seal across a member change; --bump appends a new
 * history entry and seals; subsequent --check passes.
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
  const dir = mkdtempSync(join(tmpdir(), "as-contract-manifest-bump-"));
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

function run(dir, args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    env: { ...process.env, AGENTSKEPTIC_CONTRACT_ROOT: dir },
    encoding: "utf8",
  });
}

test("--write refuses to seal after member change (CONTRACT_MANIFEST_BUMP_REQUIRED, exit 7)", () => {
  const dir = buildFixture();
  const memberPath = join(dir, "schemas", "event.schema.json");
  writeFileSync(memberPath, readFileSync(memberPath, "utf8") + "\n", "utf8");

  const r = run(dir, ["--write"]);
  assert.equal(r.status, 7, `stderr=\n${r.stderr}`);
  assert.match(r.stderr, /CONTRACT_MANIFEST_BUMP_REQUIRED/);
});

test("--bump patch + --sync-package-pin produces a valid manifest that --check accepts", () => {
  const dir = buildFixture();
  const memberPath = join(dir, "schemas", "event.schema.json");
  writeFileSync(memberPath, readFileSync(memberPath, "utf8") + "\n", "utf8");

  const bump = run(dir, ["--bump", "patch"]);
  assert.equal(bump.status, 0, `bump stderr=\n${bump.stderr}`);
  const sync = run(dir, ["--sync-package-pin"]);
  assert.equal(sync.status, 0, `sync stderr=\n${sync.stderr}`);

  const check = run(dir, ["--check"]);
  assert.equal(check.status, 0, `check stderr=\n${check.stderr}`);

  const manifest = JSON.parse(
    readFileSync(join(dir, "schemas", "contract", "v1.json"), "utf8"),
  );
  assert.equal(manifest.manifestVersion, "1.0.1");
  assert.equal(manifest.history.length, 2);
  assert.equal(manifest.history[manifest.history.length - 1].manifestVersion, "1.0.1");
});
