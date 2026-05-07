/**
 * Bundled demo uses `agentskeptic check` and emits canonical `truth_check_verdict` on stderr (npm start contract).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareBundledDemoDb, runBundledTruthCheck, bundledDemoPaths } from "../scripts/lib/bundledDemoCheck.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("bundled demo canonical contract", () => {
  it("bundled_demo_spawns_truth_check_via_check_token", () => {
    const src = readFileSync(join(root, "scripts", "lib", "bundledDemoCheck.mjs"), "utf8");
    assert.match(src, /\bcheck\b[\s\S]*--workflow-id/s, "argv must route through check subcommand");
    assert.ok(!src.includes("internal-invoked-via-check"), "check token must not bypass through internal flag leakage");
    const demo = readFileSync(join(root, "scripts", "demo.mjs"), "utf8");
    assert.ok(demo.includes("runBundledTruthCheck"), "demo delegates to bundled check helper");
  });

  it("bundled_truth_check_emits_stderr_verdict_like_npm_start", () => {
    prepareBundledDemoDb();
    const pipe = ["ignore", "pipe", "pipe"];

    let r = runBundledTruthCheck("wf_complete", pipe);
    assert.equal(r.status, 0, r.stderr || "");
    const e0 = String(r.stderr).replace(/\r\n/g, "\n");
    assert.ok(/^truth_check_verdict: trusted$/m.test(e0), `wf_complete stderr missing verdict: ${e0.slice(0, 240)}`);

    r = runBundledTruthCheck("wf_missing", pipe);
    assert.equal(r.status, 1, r.stderr || "");
    const e1 = String(r.stderr).replace(/\r\n/g, "\n");
    assert.ok(
      /^truth_check_verdict: not_trusted$/m.test(e1),
      `wf_missing stderr missing verdict: ${e1.slice(0, 240)}`,
    );
  });

  it("bundled_demo_db_path_is_stable", () => {
    assert.equal(bundledDemoPaths.dbPath, join(root, "examples", "demo.db"));
  });
});
