import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "schemas", "openapi-commercial-v1.yaml");
const destDir = join(root, "website", "public");
mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "openapi-commercial-v1.yaml"));
console.log("Copied schemas/openapi-commercial-v1.yaml → website/public/openapi-commercial-v1.yaml");
