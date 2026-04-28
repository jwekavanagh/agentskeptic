import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ONBOARDING_FILES = [
  join(root, "README.md"),
  join(root, "docs", "integrate.md"),
  join(root, "examples", "golden-next-postgres", "app", "api", "verify", "route.ts"),
];

test("canonical onboarding surfaces are emitter-first", () => {
  for (const p of ONBOARDING_FILES) {
    const text = readFileSync(p, "utf8");
    assert.match(text, /createEmitter|CanonicalEventEmitter|BufferSink/);
    assert.doesNotMatch(text, /for \(const ev of body\.events \?\? \[\]\) gate\.appendRunEvent\(ev\)/);
  }
});
