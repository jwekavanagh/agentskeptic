/**
 * Contract: `agentskeptic decision-bundle validate` is self-verifying.
 *
 * For every fixture row, this test feeds the input directory to the CLI and:
 *  1. Asserts the actual `bundleDir` field === `realpathSync(fixtureDir)`.
 *  2. Deletes `bundleDir` from the parsed stdout and deep-equality-compares it to the committed
 *     `expected/<name>.payload.json` golden (which never contains `bundleDir`).
 *
 * The committed expected/*.payload.json goldens are hand-derived (from the failure codes and
 * integrity rules), not produced by the validator. If the validator drifts, the test fails.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = realpathSync(join(import.meta.dirname ?? new URL(".", import.meta.url).pathname, ".."));
const FIXTURE_ROOT = join(ROOT, "test", "fixtures", "decision-bundle-integrity");
const KEYS_DIR = join(FIXTURE_ROOT, "keys");
const EXPECTED_DIR = join(FIXTURE_ROOT, "expected");
const CLI = join(ROOT, "dist", "cli.js");

function runValidate(fixtureDir, extraArgs = []) {
  const argv = ["decision-bundle", "validate", fixtureDir, ...extraArgs];
  const result = spawnSync(process.execPath, [CLI, ...argv], { encoding: "utf8" });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exit: result.status,
  };
}

function parseSingleStdoutLine(stdout) {
  const lines = stdout.split("\n").filter((l) => l.length > 0);
  assert.equal(lines.length, 1, `expected exactly one stdout line, got:\n${stdout}`);
  return JSON.parse(lines[0]);
}

const ROWS = [
  {
    name: "valid-unsigned",
    dir: join(FIXTURE_ROOT, "valid-unsigned"),
    args: [],
    expectedExit: 0,
    expected: "valid-unsigned.payload.json",
  },
  {
    name: "valid-signed (correct public key)",
    dir: join(FIXTURE_ROOT, "valid-signed"),
    args: ["--public-key", join(KEYS_DIR, "test-pub.pem")],
    expectedExit: 0,
    expected: "valid-signed.payload.json",
  },
  {
    name: "legacy-v1",
    dir: join(FIXTURE_ROOT, "legacy-v1"),
    args: [],
    expectedExit: 0,
    expected: "legacy-v1.payload.json",
  },
  {
    name: "tampered-certificate",
    dir: join(FIXTURE_ROOT, "tampered-certificate"),
    args: ["--public-key", join(KEYS_DIR, "test-pub.pem")],
    expectedExit: 2,
    expected: "tampered-certificate.payload.json",
  },
  {
    name: "tampered-material-truth",
    dir: join(FIXTURE_ROOT, "tampered-material-truth"),
    args: ["--public-key", join(KEYS_DIR, "test-pub.pem")],
    expectedExit: 2,
    expected: "tampered-material-truth.payload.json",
  },
  {
    name: "missing-material-truth",
    dir: join(FIXTURE_ROOT, "missing-material-truth"),
    args: ["--public-key", join(KEYS_DIR, "test-pub.pem")],
    expectedExit: 2,
    expected: "missing-material-truth.payload.json",
  },
  {
    name: "valid-signed (no --public-key)",
    dir: join(FIXTURE_ROOT, "valid-signed"),
    args: [],
    expectedExit: 2,
    expected: "signed-without-key.payload.json",
  },
  {
    name: "valid-signed (wrong public key)",
    dir: join(FIXTURE_ROOT, "valid-signed"),
    args: ["--public-key", join(KEYS_DIR, "test-pub-wrong.pem")],
    expectedExit: 2,
    expected: "wrong-public-key.payload.json",
  },
  {
    name: "manifest-broken-json",
    dir: join(FIXTURE_ROOT, "manifest-broken-json"),
    args: [],
    expectedExit: 2,
    expected: "manifest-broken-json.payload.json",
  },
  {
    name: "manifest-extra-key",
    dir: join(FIXTURE_ROOT, "manifest-extra-key"),
    args: [],
    expectedExit: 2,
    expected: "manifest-extra-key.payload.json",
  },
];

describe("decision-bundle validate: self-verifying contract", () => {
  before(() => {
    if (!existsSync(CLI)) {
      throw new Error(`CLI build artifact missing at ${CLI}; run \`npm run build\` first.`);
    }
  });

  for (const row of ROWS) {
    it(`${row.name} → exit ${row.expectedExit} + matches ${row.expected}`, () => {
      const { stdout, exit } = runValidate(row.dir, row.args);
      assert.equal(exit, row.expectedExit, `unexpected exit code\nSTDOUT:\n${stdout}`);

      const actual = parseSingleStdoutLine(stdout);
      const fixtureReal = realpathSync(row.dir);
      assert.equal(actual.bundleDir, fixtureReal, "bundleDir must equal realpath of fixture dir");
      delete actual.bundleDir;

      const expected = JSON.parse(readFileSync(join(EXPECTED_DIR, row.expected), "utf8"));
      assert.deepEqual(
        actual,
        expected,
        `validator output drifted from golden ${row.expected}`,
      );
    });
  }

  it("missing bundleDir → exit 3 + no stdout JSON line + stderr envelope", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "ds-missing-"));
    const nonexistent = join(tmpRoot, "does-not-exist");
    try {
      const { stdout, stderr, exit } = runValidate(nonexistent, []);
      assert.equal(exit, 3, `expected exit 3 for missing dir; stdout=${stdout} stderr=${stderr}`);
      assert.equal(stdout.trim(), "", "expected no stdout JSON line on Tier-1 failure");
      assert.ok(stderr.length > 0, "expected stderr envelope on Tier-1 failure");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
