#!/usr/bin/env node
/**
 * Copy the canonical Verification Contract Manifest (`schemas/contract/v1.json`)
 * to the static asset path served by Next.js (`website/public/contract/v1.json`).
 *
 * Single serving model: static asset only. The Next site has no route handler
 * for `/contract/v1.json`. Run this from the website prebuild chain via
 * `scripts/sync-website-ssot.mjs`.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "schemas", "contract", "v1.json");
const TARGET = join(ROOT, "website", "public", "contract", "v1.json");

const bytes = readFileSync(SOURCE);
mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, bytes);

console.log(`sync-contract-manifest-static: wrote ${TARGET} (${bytes.length} bytes)`);
