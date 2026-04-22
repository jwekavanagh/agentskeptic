import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRepoRoot } from "./helpers/distributionGraphHelpers";

const require = createRequire(import.meta.url);

describe("marketing config", () => {
  it("validates with discovery-acquisition.lib (invariants)", () => {
    const root = getRepoRoot();
    require(join(root, "scripts", "discovery-acquisition.lib.cjs")).validateDiscoveryAcquisition(root);
  });

  it("r2.frameworkMaturity: if AutoGen is named, the line must acknowledge experimental", () => {
    const root = getRepoRoot();
    const m = JSON.parse(readFileSync(join(root, "config", "marketing.json"), "utf8")) as {
      r2: { frameworkMaturity: string };
    };
    const t = m.r2.frameworkMaturity;
    if (/\bautogen\b/i.test(t)) {
      expect(t.toLowerCase()).toContain("experimental");
    }
  });
});
