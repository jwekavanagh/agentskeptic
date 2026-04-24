import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Resolve drizzle-kit's `bin.cjs` for this workspace. npm workspaces may hoist
 * the package under `website/node_modules` (typical in CI) or the repo root.
 *
 * @param {string} websiteRoot Absolute path to the website workspace.
 * @returns {string}
 */
export function resolveDrizzleKitBin(websiteRoot) {
  const inWebsite = path.join(websiteRoot, "node_modules", "drizzle-kit", "bin.cjs");
  const inRoot = path.join(websiteRoot, "..", "node_modules", "drizzle-kit", "bin.cjs");
  if (existsSync(inWebsite)) return inWebsite;
  if (existsSync(inRoot)) return inRoot;
  throw new Error(
    "drizzle-kit not found. Run npm install from the repository root. Tried:\n" +
      `  - ${inWebsite}\n` +
      `  - ${inRoot}`,
  );
}
