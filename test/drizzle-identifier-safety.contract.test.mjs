/**
 * Machine-checked Drizzle patterns from docs/dependency-security-pins.json (drizzleMachineChecks).
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "website", "src");

function loadManifest() {
  const p = path.join(repoRoot, "docs", "dependency-security-pins.json");
  return JSON.parse(readFileSync(p, "utf8"));
}

function* walkTs(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkTs(full);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) yield full;
  }
}

test("website/src has no drizzleMachineChecks pattern matches", () => {
  const { drizzleMachineChecks } = loadManifest();
  const checks = drizzleMachineChecks.map((c) => ({
    id: c.id,
    re: new RegExp(c.regex, c.flags === "" ? undefined : c.flags),
  }));
  for (const file of walkTs(srcRoot)) {
    const text = readFileSync(file, "utf8");
    for (const { id, re } of checks) {
      if (re.test(text)) {
        throw new Error(`DRIZZLE_MACHINE_CHECK_FAIL id=${id} file=${path.relative(repoRoot, file)} pattern=${re}`);
      }
    }
  }
});
