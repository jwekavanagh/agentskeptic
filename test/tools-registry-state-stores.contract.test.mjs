/**
 * Golden registry for state-store verification kinds (schema contract).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSchemaValidator } from "../dist/schemaLoad.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("tools-registry state-stores example", () => {
  it("examples/tools-state-stores.json validates against tools-registry schema", () => {
    const v = loadSchemaValidator("tools-registry");
    const reg = JSON.parse(readFileSync(join(root, "examples", "tools-state-stores.json"), "utf8"));
    assert.equal(v(reg), true, JSON.stringify(v.errors ?? []));
  });
});
