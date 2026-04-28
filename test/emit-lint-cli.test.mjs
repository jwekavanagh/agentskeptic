import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cliJs = join(root, "dist", "cli.js");

describe("emit-lint CLI", () => {
  it("passes for canonical example workflow", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--no-warnings",
        cliJs,
        "emit-lint",
        "--workflow-id",
        "wf_complete",
        "--events",
        join(root, "examples", "events.ndjson"),
      ],
      { encoding: "utf8", cwd: root },
    );
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout.trim());
    assert.equal(out.ok, true);
    assert.equal(out.workflowId, "wf_complete");
  });

  it("fails with usage envelope when required args missing", () => {
    const r = spawnSync(process.execPath, ["--no-warnings", cliJs, "emit-lint"], {
      encoding: "utf8",
      cwd: root,
    });
    assert.equal(r.status, 3);
    const err = JSON.parse(r.stderr.trim());
    assert.equal(err.code, "EMIT_LINT_USAGE");
  });
});
