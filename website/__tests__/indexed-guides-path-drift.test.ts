import sitemap from "@/app/sitemap";
import { publicProductAnchors } from "@/lib/publicProductAnchors";
import { listAllSurfaces } from "@/lib/surfaceMarkdown";
import { describe, expect, it } from "vitest";

describe("markdown discovery path drift", () => {
  it("sitemap guide leaf URLs match guides/*.md routes exactly", async () => {
    const base = publicProductAnchors.productionCanonicalOrigin.replace(/\/$/, "");
    const expected = new Set(
      listAllSurfaces()
        .filter((s) => s.segment === "guides")
        .map((s) => `${base}${s.route}`),
    );
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const guideLeafUrls = new Set([...urls].filter((u) => u.startsWith(`${base}/guides/`)));
    expect(guideLeafUrls).toEqual(expected);
  });

  it("sitemap example leaf URLs match examples/*.md routes exactly", async () => {
    const base = publicProductAnchors.productionCanonicalOrigin.replace(/\/$/, "");
    const expected = new Set(
      listAllSurfaces()
        .filter((s) => s.segment === "examples")
        .map((s) => `${base}${s.route}`),
    );
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const exampleLeafUrls = new Set([...urls].filter((u) => u.startsWith(`${base}/examples/`)));
    expect(exampleLeafUrls).toEqual(expected);
  });

  it("sitemap compare leaf URLs match compare/*.md routes exactly", async () => {
    const base = publicProductAnchors.productionCanonicalOrigin.replace(/\/$/, "");
    const expected = new Set(
      listAllSurfaces()
        .filter((s) => s.segment === "compare")
        .map((s) => `${base}${s.route}`),
    );
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    const compareLeafUrls = new Set([...urls].filter((u) => u.startsWith(`${base}/compare/`)));
    expect(compareLeafUrls).toEqual(expected);
  });
});
