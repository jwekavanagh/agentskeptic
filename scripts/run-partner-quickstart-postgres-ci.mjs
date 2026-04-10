#!/usr/bin/env node
/**
 * CI helper: if POSTGRES_ADMIN_URL is set, run partner-quickstart-verify with PARTNER_POSTGRES_URL.
 * No-op exit 0 when unset (local dev without postgres CI vars).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const admin = process.env.POSTGRES_ADMIN_URL?.trim();
if (!admin) {
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, PARTNER_POSTGRES_URL: admin };
const r = spawnSync(process.execPath, ["scripts/partner-quickstart-verify.mjs"], {
  cwd: root,
  stdio: "inherit",
  env,
});
process.exit(r.status ?? 1);
