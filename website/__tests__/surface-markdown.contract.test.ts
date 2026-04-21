import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  expectedRouteForFile,
  listAllSurfaces,
  listDiscoveryRoutes,
  parseSurfaceMarkdownRaw,
  readSurfaceFile,
  surfacesContentRoot,
  SURFACE_SEGMENTS,
  type SurfaceSegment,
} from "@/lib/surfaceMarkdown";

describe("surface markdown contracts", () => {
  it("listDiscoveryRoutes follows listAllSurfaces order", () => {
    expect(listDiscoveryRoutes()).toEqual(listAllSurfaces().map((s) => s.route));
  });

  it("filename aligns with route for every surface", () => {
    for (const s of listAllSurfaces()) {
      expect(expectedRouteForFile(s.segment, s.slug)).toBe(s.route);
    }
  });

  it("rejects slug that disagrees with frontmatter route", () => {
    const seg: SurfaceSegment = "guides";
    const slug = "verify-langgraph-workflows";
    const raw = readFileSync(join(surfacesContentRoot(), seg, `${slug}.md`), "utf8");
    expect(() => parseSurfaceMarkdownRaw(raw, seg, "wrong-slug")).toThrow(/route must be/);
  });

  it("parses every committed markdown file under surfaces", () => {
    for (const segment of SURFACE_SEGMENTS) {
      const dir = join(surfacesContentRoot(), segment);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".md")) continue;
        const slug = f.replace(/\.md$/, "");
        expect(() => readSurfaceFile(segment, slug)).not.toThrow();
      }
    }
  });
});
