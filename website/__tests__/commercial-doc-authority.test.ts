import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..");

describe("commercial doc authority", () => {
  it("marks secondary docs non-normative", () => {
    const activation = readFileSync(join(root, "docs", "commercial-http-activation.md"), "utf8");
    const websiteReadme = readFileSync(join(root, "website", "README.md"), "utf8");
    expect(activation).toMatch(/Non-normative companion/i);
    expect(websiteReadme).toMatch(/Non-normative implementation guide/i);
  });

  it("keeps normative quota semantics in commercial.md", () => {
    const commercial = readFileSync(join(root, "docs", "commercial.md"), "utf8");
    expect(commercial).toContain("## HTTP — `GET /api/v1/usage/current`");
    expect(commercial).toContain("### Quota semantics (normative)");
  });
});

