#!/usr/bin/env node
/**
 * Ensures `npm run sync:public-product-anchors` produced discovery files under `website/public/`.
 * Run after sync (root package.json) and at end of website `prebuild` so deploys fail fast if sync breaks.
 */
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "website", "public");
const required = ["llms.txt", "openapi-commercial-v1.yaml"];

const errors = [];
for (const name of required) {
  const p = path.join(dir, name);
  if (!existsSync(p)) {
    errors.push(`missing: ${path.relative(root, p)}`);
    continue;
  }
  try {
    if (statSync(p).size === 0) {
      errors.push(`empty: ${path.relative(root, p)}`);
    }
  } catch (e) {
    errors.push(`stat failed: ${path.relative(root, p)} (${/** @type {Error} */ (e).message})`);
  }
}

if (errors.length > 0) {
  console.error(
    "assert-discovery-public-files: discovery public artifacts invalid. Run `npm run sync:public-product-anchors` from repo root.\n" +
      errors.map((l) => `  - ${l}`).join("\n"),
  );
  process.exit(1);
}
