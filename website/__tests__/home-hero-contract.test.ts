import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("home hero contract (page.tsx source)", () => {
  const src = readFileSync(path.join(__dirname, "..", "src", "app", "page.tsx"), "utf8");

  it("hero section has CTA to demo, Read the docs, Get started install hint; no Try it embedded; terminal proof", () => {
    const sliceStart = src.indexOf("data-testid={productCopy.uiTestIds.hero}");
    expect(sliceStart).toBeGreaterThanOrEqual(0);
    const end = src.indexOf("</section>", sliceStart);
    expect(end).toBeGreaterThan(sliceStart);
    const heroSlice = src.slice(sliceStart, end);

    const ctaRowStart = heroSlice.indexOf('data-testid="home-hero-cta-row"');
    expect(ctaRowStart).toBeGreaterThanOrEqual(0);
    const ctaRowEnd = heroSlice.indexOf("</p>", ctaRowStart);
    expect(ctaRowEnd).toBeGreaterThan(ctaRowStart);
    const ctaRowSlice = heroSlice.slice(ctaRowStart, ctaRowEnd);

    const linkOpens = (ctaRowSlice.match(/<a\b/g) ?? []).length + (ctaRowSlice.match(/<Link\b/g) ?? []).length;
    expect(linkOpens).toBe(2);

    expect(ctaRowSlice).not.toContain('href="/pricing"');
    expect(ctaRowSlice.split('href="/?demo=wf_missing#try-it"').length - 1).toBe(1);
    expect(heroSlice).toContain('data-testid="home-hero-cta-row"');
    expect(heroSlice).toContain("data-testid={productCopy.homePageHeroSecondaryCta.testId}");
    const tryIdx = ctaRowSlice.indexOf('href="/?demo=wf_missing#try-it"');
    const secondaryIdx = ctaRowSlice.indexOf("data-testid={productCopy.homePageHeroSecondaryCta.testId}");
    expect(tryIdx).toBeGreaterThanOrEqual(0);
    expect(secondaryIdx).toBeGreaterThan(tryIdx);
    expect(heroSlice).toContain("href={productCopy.homePageHeroSecondaryCta.href}");
    expect(heroSlice).toContain("home-hero-positioning");
    expect(heroSlice).toContain('data-testid="home-hero-install-cta"');
    expect(heroSlice).toContain("href={productCopy.homeHeroSecondaryCta.href}");
    expect(heroSlice).toContain('data-testid="home-hero-terminal"');
    expect(heroSlice).toContain("home-hero-grid");
    expect(heroSlice).toContain("homeValueProposition");
    expect(heroSlice).not.toContain("<strong>What:</strong>");
    expect(heroSlice).not.toContain("<strong>Why:</strong>");
    expect(heroSlice).not.toContain("<strong>When:</strong>");
    expect(heroSlice).not.toContain("<TryItSection");
  });
});
