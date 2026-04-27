import { copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const out = join(root, "dist", "cli", "init-starter");
mkdirSync(out, { recursive: true });
for (const f of ["tools.json", "events.ndjson", "seed.sql"]) {
  copyFileSync(join(root, "examples", f), join(out, f));
}
