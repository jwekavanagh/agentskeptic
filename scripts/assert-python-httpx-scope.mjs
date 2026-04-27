#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const root = join(process.cwd(), "python", "src", "agentskeptic");

function walk(dir, out) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "__pycache__") walk(p, out);
    else if (ent.isFile() && extname(p) === ".py") out.push(p);
  }
}

const files = [];
walk(root, files);
const bad = [];
for (const f of files) {
  if (f.replace(/\\/g, "/").endsWith("_http.py")) continue;
  const t = readFileSync(f, "utf8");
  if (/^import httpx|^from httpx/m.test(t)) bad.push(f);
}
if (bad.length) {
  console.error("httpx import only allowed in _http.py:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("assert-python-httpx-scope: ok");
