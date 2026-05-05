import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("CLI UX contract cleanup guards", () => {
  it("quick stdout contract is Outcome Certificate in source + docs", () => {
    const cliSrc = readFileSync(join(root, "src", "cli.ts"), "utf8");
    assert.ok(
      cliSrc.includes("writeSync(1, `${stableStringify(certificate)}\\n`)"),
      "quick subcommand should emit certificate JSON on stdout",
    );

    const quickSpec = readFileSync(join(root, "docs", "quick-verify-normative.md"), "utf8");
    assert.ok(
      quickSpec.includes("stableStringify(certificate)"),
      "quick normative doc should describe certificate stdout contract",
    );
    assert.equal(
      quickSpec.includes("stableStringify(report) + \"\\\\n\""),
      false,
      "quick normative doc must not claim report JSON is stdout payload",
    );
  });

  it("quick lock flag error points to check, not verify", () => {
    const cliSrc = readFileSync(join(root, "src", "cli.ts"), "utf8");
    assert.ok(
      cliSrc.includes("Use `agentskeptic check` for stateless checks"),
      "quick lock-flag copy should direct users to agentskeptic check",
    );
    assert.equal(
      cliSrc.includes("Use `agentskeptic verify` for stateless checks"),
      false,
      "quick lock-flag copy must not mention removed agentskeptic verify command",
    );
  });

  it("init scaffolding script uses agentskeptic check", () => {
    const initSrc = readFileSync(join(root, "src", "cli", "initCommand.ts"), "utf8");
    assert.ok(
      initSrc.includes('"verify:agentskeptic": "agentskeptic check --workflow-id wf_complete'),
      "init-generated script should use explicit check command",
    );
    assert.ok(
      initSrc.includes("npx agentskeptic check --workflow-id wf_complete"),
      "Next init README snippet should use canonical check command",
    );
  });

  it("README and integrate docs explicitly document receipt side effect", () => {
    const readme = readFileSync(join(root, "README.md"), "utf8");
    const integrate = readFileSync(join(root, "docs", "integrate.md"), "utf8");
    const required = "artifacts/agentskeptic-receipts/";

    assert.ok(readme.includes(required), "README should mention verification receipt path");
    assert.ok(integrate.includes(required), "integrate doc should mention verification receipt path");
  });

  it("bootstrap template and docs no longer imply agentskeptic verify subcommand", () => {
    const bootstrapTemplate = readFileSync(
      join(root, "src", "bootstrap", "bootstrapReadmeTemplate.ts"),
      "utf8",
    );
    assert.equal(
      /agentskeptic verify --workflow-id/.test(bootstrapTemplate),
      false,
      "bootstrap template must not suggest a non-existent agentskeptic verify subcommand",
    );
    assert.ok(
      /agentskeptic check --workflow-id/.test(bootstrapTemplate),
      "bootstrap template should use agentskeptic check",
    );
  });

  it("advanced help keeps fully-qualified verify-bundle-signature command", () => {
    const cliSrc = readFileSync(join(root, "src", "cli.ts"), "utf8");
    assert.ok(
      cliSrc.includes("agentskeptic verify-bundle-signature --run-dir <dir> --public-key <path>"),
      "help text should include full command name for verify-bundle-signature",
    );
  });

  it("selected user-facing docs avoid bare agentskeptic verify command wording", () => {
    const userFacingFiles = [
      join(root, "README.md"),
      join(root, "docs", "integrate.md"),
      join(root, "docs", "quick-verify-normative.md"),
      join(root, "docs", "outcome-certificate-integrator.md"),
      join(root, "docs", "bootstrap-pack-normative.md"),
      join(root, "docs", "ci-enforcement.md"),
      join(root, "docs", "commercial.md"),
      join(root, "docs", "commercial-entitlement-policy.md"),
      join(root, "docs", "verification-execution-ssot.md"),
    ];
    const bareVerifyCmd = /\bagentskeptic verify(?:\s|`|$)/;
    for (const f of userFacingFiles) {
      const text = readFileSync(f, "utf8");
      assert.equal(
        bareVerifyCmd.test(text),
        false,
        `${f} must not imply bare agentskeptic verify subcommand`,
      );
    }
  });
});
