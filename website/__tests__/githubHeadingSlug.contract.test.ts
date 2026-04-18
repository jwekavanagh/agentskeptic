import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { githubHeadingSlug } from "@/lib/githubHeadingSlug";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "..", "..", "test", "fixtures", "github-heading-slug-vectors.json");

type VectorRow = { headingText: string; expectedSlug: string };

describe("githubHeadingSlug", () => {
  it("matches normative File A vectors", () => {
    const rows = JSON.parse(readFileSync(fixturePath, "utf8")) as VectorRow[];
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(githubHeadingSlug(row.headingText)).toBe(row.expectedSlug);
    }
  });
});
