#!/usr/bin/env node
/**
 * SSOT checks for partner quickstart: generated commands, prose doc, schema prefix, tools JSON not inlined in prose.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function fail(msg) {
  console.error("check-partner-quickstart-ssot:", msg);
  process.exit(1);
}

const gen = spawnSync(process.execPath, ["scripts/generate-partner-quickstart-commands.mjs", "--check"], {
  cwd: root,
  encoding: "utf8",
});
if (gen.status !== 0) {
  console.error(gen.stderr || gen.stdout);
  process.exit(gen.status ?? 1);
}

const prosePath = path.join(root, "docs", "first-run-integration.md");
if (!existsSync(prosePath)) fail("missing docs/first-run-integration.md");
const prose = readFileSync(prosePath, "utf8");

const toolsPath = path.join(root, "examples", "partner-quickstart", "partner.tools.json");
const T = JSON.stringify(JSON.parse(readFileSync(toolsPath, "utf8")));
if (prose.includes(T)) {
  fail("first-run-integration.md must not embed minified partner.tools.json (substring T)");
}

const linkNeedle = "[partner-quickstart-commands.md](partner-quickstart-commands.md)";
const linkCount = prose.split(linkNeedle).length - 1;
if (linkCount !== 1) {
  fail(`first-run-integration.md must contain exactly one link ${linkNeedle}; count=${linkCount}`);
}

const seedPath = path.join(root, "examples", "partner-quickstart", "partner.seed.sql");
const schemaPath = path.join(root, "examples", "partner-quickstart", "partner.schema-only.sql");
const seed = readFileSync(seedPath, "utf8");
const schemaOnly = readFileSync(schemaPath, "utf8");
const prefix = schemaOnly.trimEnd() + "\n";
if (!seed.startsWith(prefix)) {
  fail("partner.seed.sql must start with partner.schema-only.sql content + single newline");
}

console.log("check-partner-quickstart-ssot: ok");
