/**
 * package.json verificationContractManifest must match history[last] and publicUrl.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

test("package.json verificationContractManifest matches contract manifest head", () => {
  const manifest = JSON.parse(
    readFileSync(join(root, "schemas", "contract", "v1.json"), "utf8"),
  );
  const head = manifest.history[manifest.history.length - 1];
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const pin = pkg.verificationContractManifest;
  assert.ok(pin && typeof pin === "object", "verificationContractManifest must exist");
  assert.equal(pin.version, head.manifestVersion);
  assert.equal(pin.manifestSha256, head.manifestSha256);
  assert.equal(pin.url, manifest.publicUrl);
});

test("package.json must not retain x-agentskeptic-decision-ready-contract marker", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(
    Object.prototype.hasOwnProperty.call(pkg, "x-agentskeptic-decision-ready-contract"),
    false,
    "the legacy contract marker must be removed",
  );
});
