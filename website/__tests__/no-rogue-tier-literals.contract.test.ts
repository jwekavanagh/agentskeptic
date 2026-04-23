import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot } from "./helpers/distributionGraphHelpers";

/** Comma-formatted thousands that must not be duplicated outside commercialNarrative. */
const FORBIDDEN = ["1,000", "5,000", "20,000", "100,000"] as const;

const ALLOW_FILE_BASE = "commercialNarrative.ts";
const EXCLUDE_DIR_NAMES = new Set(["__tests__", "__mocks__", ".next", "node_modules"]);

function walkSrc(dir: string, root: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "." || name === "..") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(name)) continue;
      walkSrc(p, root, out);
    } else if (s.isFile()) {
      if (![".ts", ".tsx", ".mjs", ".cjs", ".js"].includes(extname(name))) continue;
      if (name.includes(".test.")) continue;
      if (name.includes(".spec.")) continue;
      if (name.includes("contract.")) continue;
      out.push(relative(root, p).replaceAll("\\", "/"));
    }
  }
}

describe("no rogue tier thousand-literals in website/src (outside commercialNarrative)", () => {
  it("fails if forbidden tier strings appear outside allowlist", () => {
    const srcRoot = join(getRepoRoot(), "website", "src");
    const relPaths: string[] = [];
    walkSrc(srcRoot, srcRoot, relPaths);
    const offenders: { file: string; literal: string }[] = [];
    for (const rel of relPaths) {
      const fileName = rel.split("/").pop() ?? rel;
      if (fileName === ALLOW_FILE_BASE) continue;
      const text = readFileSync(join(srcRoot, rel), "utf8");
      for (const lit of FORBIDDEN) {
        if (text.includes(lit)) {
          offenders.push({ file: rel, literal: lit });
        }
      }
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});
