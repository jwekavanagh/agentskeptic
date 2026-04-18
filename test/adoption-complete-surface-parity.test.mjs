/**
 * PatternComplete / checklist IDs must appear on integrator surfaces (plan parity).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const NEEDLES = [
  "PatternComplete",
  "AdoptionComplete_PatternComplete",
  "AC-TRUST-01",
  "AC-OPS-01",
];

describe("adoption complete surface parity", () => {
  it("first_run_integration_doc_contains_needles", () => {
    const t = readFileSync(join(root, "docs", "first-run-integration.md"), "utf8");
    for (const n of NEEDLES) assert.ok(t.includes(n), `missing in first-run-integration.md: ${n}`);
  });

  it("integrate_activation_shell_template_contains_needles", () => {
    const t = readFileSync(join(root, "scripts", "templates", "integrate-activation-shell.bash"), "utf8");
    assert.ok(t.includes("PatternComplete"), "bash template must name PatternComplete");
    assert.ok(t.includes("ADOPT_DB"), "bash template must use ADOPT_DB temp copy");
    assert.ok(t.includes('"$ADOPT_DB"'), "bash template must verify against ADOPT_DB");
  });

  it("product_copy_integrate_activation_contains_needles", () => {
    const t = readFileSync(join(root, "website", "src", "content", "productCopy.ts"), "utf8");
    for (const n of NEEDLES) assert.ok(t.includes(n), `missing in productCopy.ts: ${n}`);
  });
});
