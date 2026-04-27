import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("lock flag removal guard", () => {
  it("cli help no longer advertises expect/output lock flags", () => {
    const cliJs = join(root, "dist", "cli.js");
    const r = spawnSync(process.execPath, ["--no-warnings", cliJs, "--help"], { encoding: "utf8", cwd: root });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.includes("--output-lock"), false);
    assert.equal(r.stdout.includes("--expect-lock"), false);
  });

  it("ci enforcement docs no longer claim OSS lock parity", () => {
    const doc = readFileSync(join(root, "docs", "ci-enforcement.md"), "utf8");
    assert.equal(doc.includes("`--output-lock <path>`"), false);
    assert.equal(doc.includes("`--expect-lock <path>`"), false);
    assert.equal(doc.includes("ci-lock-v1"), false);
  });
});

