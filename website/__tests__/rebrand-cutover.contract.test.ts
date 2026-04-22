import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FORBIDDEN_SUBSTRINGS = ["#5c6cfa", "#aab4ff", "DM_Sans"] as const;

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walkFiles(full, acc);
    } else if (/\.(tsx?|css|jsx?|json)$/i.test(name.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("rebrand cutover (retired brand removed)", () => {
  it("website/src and website/public contain no forbidden hex or DM_Sans", () => {
    const webRoot = path.join(__dirname, "..");
    for (const sub of ["src", "public"]) {
      const root = path.join(webRoot, sub);
      if (!existsSync(root)) continue;
      const files = walkFiles(root);
      for (const file of files) {
        const raw = readFileSync(file, "utf8");
        for (const bad of FORBIDDEN_SUBSTRINGS) {
          expect(raw, file).not.toContain(bad);
        }
      }
    }
  });

  it("globals.css :root uses signal accent", () => {
    const css = readFileSync(path.join(__dirname, "..", "src", "app", "globals.css"), "utf8");
    expect(css).toContain("--accent: #00c853;");
  });

  it("SiteHeader imports BrandLockup", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "app", "SiteHeader.tsx"), "utf8");
    expect(src).toMatch(/BrandLockup/);
    expect(src).toMatch(/from ["']@\/components\/BrandLockup["']/);
  });

  it("SiteHeader has no plain-text-only home logo link", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "app", "SiteHeader.tsx"), "utf8");
    expect(src).not.toMatch(/<Link href="\/"[^>]*>\s*AgentSkeptic\s*<\/Link>/);
  });
});
