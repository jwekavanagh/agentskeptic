/**
 * SSOT docs + quick --help advertise preview vs decision-grade check / truth_check_verdict ownership.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("first-truth-check onboarding SSOT anchors", () => {
  const md = () => readFileSync(join(root, "docs", "first-truth-check.md"), "utf8");

  it("documents validate-registry CLI", () => {
    assert.ok(md().includes("validate-registry"), "first-truth-check must mention registry validation CLI");
    assert.ok(
      md().includes("agentskeptic validate-registry"),
      "first-truth-check must include canonical validate-registry command",
    );
  });

  it("documents_preview_versus_contract_section", () => {
    assert.ok(
      /^## .*[Pp]review versus contract verification/m.test(md()),
      'first-truth-check must contain "## Preview versus contract verification"',
    );
  });

  it("states_truth_check_verdict_not_on_quick_stderr", () => {
    assert.ok(md().includes("Not emitted on stderr."), "must say truth_check verdict is not on quick stderr");
    assert.ok(md().includes("agentskeptic check"), "must cite check command");
  });
});

describe("quick --help onboarding copy", () => {
  it("directs_truth_check_verdict_to_check_subcommand_help", () => {
    const cli = join(root, "dist", "cli.js");
    assert.ok(existsSync(cli), "run npm run build before this test path");
    const r = spawnSync(process.execPath, ["--no-warnings", cli, "quick", "--help"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.ok(/\btruth_check_verdict\b/.test(r.stdout), 'quick --help mentions "truth_check_verdict" ownership');
    assert.ok(/agentskeptic check|`agentskeptic check`/.test(r.stdout), "quick --help cites agentskeptic check");
  });
});
