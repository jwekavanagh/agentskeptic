#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const root = join(process.cwd(), "src");

function walk(dir, out) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && extname(p) === ".ts" && !p.includes(".test.")) out.push(p);
  }
}

function norm(p) {
  return p.replace(/\\/g, "/");
}

const files = [];
walk(root, files);
const bad = [];

for (const f of files) {
  const n = norm(f);
  if (n.endsWith("/src/sdk/transport.ts")) continue;
  if (n.includes("/src/telemetry/")) continue;
  if (n.endsWith("/src/stateWitness.ts")) continue;

  const t = readFileSync(f, "utf8");
  if (/\bfetch\s*\(/.test(t)) bad.push(f);
}

if (bad.length) {
  console.error("Disallowed `fetch(` outside src/sdk/transport.ts, telemetry/, stateWitness.ts:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("assert-no-adhoc-fetch-for-activation: ok");
