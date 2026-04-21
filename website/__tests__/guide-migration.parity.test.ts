import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { markdownSurfacePlainText } from "./helpers/markdownSurfacePlainText";
import goldens from "./fixtures/guide-migration-goldens.json";
import floors from "./fixtures/guide-migration-length-floors.json";
import { splitFrontmatter } from "@/lib/surfaceMarkdown";

const SLUGS = Object.keys(goldens);

describe("guide migration parity", () => {
  it("plain text retains golden substrings and meets length floors", () => {
    const root = join(process.cwd(), "content", "surfaces", "guides");
    for (const slug of SLUGS) {
      const raw = readFileSync(join(root, `${slug}.md`), "utf8");
      const { body } = splitFrontmatter(raw);
      const plain = markdownSurfacePlainText(body);
      const g = goldens[slug as keyof typeof goldens];
      expect(g?.requiredSubstrings?.length).toBeGreaterThanOrEqual(8);
      for (const s of g!.requiredSubstrings) {
        expect(s.length).toBeGreaterThanOrEqual(24);
        expect(plain.includes(s), `missing in ${slug}: ${s.slice(0, 80)}…`).toBe(true);
      }
      const floor = floors[slug as keyof typeof floors];
      expect(typeof floor).toBe("number");
      expect(plain.length).toBeGreaterThanOrEqual(floor);
    }
  });
});
