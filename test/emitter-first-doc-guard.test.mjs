import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PRIMARY_CHECK_ONBOARDING = [join(root, "README.md"), join(root, "docs", "integrate.md")];
const EMITTER_EXAMPLE_ROUTE = join(root, "examples", "golden-next-postgres", "app", "api", "verify", "route.ts");

const BAD_MANUAL_APPEND_LOOP = /for \(const ev of body\.events \?\? \[\]\) gate\.appendRunEvent\(ev\)/;

test("canonical onboarding surfaces are emitter-first", () => {
  const primaryPath = /agentskeptic check|`agentskeptic check`|AgentSkeptic\.check|\.check\(/;
  const emitterPath = /createEmitter|CanonicalEventEmitter|BufferSink/;

  for (const p of PRIMARY_CHECK_ONBOARDING) {
    const text = readFileSync(p, "utf8");
    assert.match(text, primaryPath);
    assert.doesNotMatch(text, BAD_MANUAL_APPEND_LOOP);
  }

  const routeText = readFileSync(EMITTER_EXAMPLE_ROUTE, "utf8");
  assert.match(routeText, emitterPath);
  assert.doesNotMatch(routeText, BAD_MANUAL_APPEND_LOOP);
});
