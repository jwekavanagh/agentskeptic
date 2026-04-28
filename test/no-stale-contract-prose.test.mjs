/**
 * Lint: contract-identity prose that was deleted from docs/agentskeptic.md
 * must not reappear there. Authors should update docs/contract.md instead.
 *
 * This is a deliberately small allowlist of phrases that previously lived at
 * the top of the SSOT and inside the "Event line schema" / "Tool registry"
 * bodies. Operational subsections (retry semantics, SQL kinds) are
 * intentionally NOT matched here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ssot = readFileSync(join(root, "docs", "agentskeptic.md"), "utf8");

const FORBIDDEN = [
  // Why-this-shape NDJSON / registry definitional bullets.
  "**NDJSON events**: One line per tool invocation",
  "**Tool registry (`tools.json`)**: Keeps",
  // Event-line definitional body.
  "The file is a **`oneOf`** union",
  "**`schemaVersion` `1`**, **`type` `tool_observed`**: legacy tool line",
  // Tool-registry definitional intro that was collapsed to a pointer.
  "File: [`schemas/tools-registry.schema.json`](../schemas/tools-registry.schema.json).",
];

test("no stale contract-identity prose in docs/agentskeptic.md", () => {
  for (const phrase of FORBIDDEN) {
    assert.equal(
      ssot.includes(phrase),
      false,
      `docs/agentskeptic.md must not contain stale contract prose: ${phrase}`,
    );
  }
});
