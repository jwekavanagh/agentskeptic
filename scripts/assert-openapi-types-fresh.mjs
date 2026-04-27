#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const schema = join(root, "schemas", "openapi-commercial-v1.yaml");
const current = readFileSync(join(root, "src", "sdk", "_generated", "openapi-types.ts"), "utf8");

const td = mkdtempSync(join(tmpdir(), "as-openapi-"));
const out = join(td, "types.ts");
try {
  execSync(`npx openapi-typescript "${schema}" -o "${out}"`, { cwd: root, stdio: "inherit", shell: true });
} catch {
  rmSync(td, { recursive: true, force: true });
  process.exit(1);
}
const gen = readFileSync(out, "utf8");
rmSync(td, { recursive: true, force: true });
if (gen !== current) {
  console.error("src/sdk/_generated/openapi-types.ts is stale; run: npm run codegen:types");
  process.exit(1);
}
console.log("assert-openapi-types-fresh: ok");
