#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const y = readFileSync(join(root, "schemas", "openapi-commercial-v1.yaml"), "utf8");
const doc = parseYaml(y);
const schemaKeys = Object.keys(doc.components?.schemas ?? {});
const py = readFileSync(join(root, "python", "src", "agentskeptic", "_models.py"), "utf8");
const classes = new Set([...py.matchAll(/^class ([A-Za-z0-9_]+)\(/gm)].map((m) => m[1]));

const missing = schemaKeys.filter((k) => !classes.has(k));
if (missing.length) {
  console.error("OpenAPI schemas without Pydantic model in _models.py:\n" + missing.join("\n"));
  process.exit(1);
}
console.log(`assert-pydantic-matches-openapi: ok (${schemaKeys.length} schemas)`);
