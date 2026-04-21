/**
 * Markdown-backed discovery surfaces: dynamic App Router handlers + on-disk .md.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);
const da = require(join(root, "scripts", "discovery-acquisition.lib.cjs"));

test("guides/[slug]/page.tsx exists and every guides route has matching markdown", () => {
  const grouped = da.listMarkdownSurfaceRoutesGrouped(root);
  const pagePath = join(root, "website", "src", "app", "guides", "[slug]", "page.tsx");
  assert.ok(existsSync(pagePath), `missing ${pagePath}`);
  for (const path of grouped.guides) {
    const seg = String(path).replace(/^\/guides\//, "");
    const mdPath = join(root, "website", "content", "surfaces", "guides", `${seg}.md`);
    assert.ok(existsSync(mdPath), `missing markdown for ${path}: ${mdPath}`);
  }
});

test("examples/[slug]/page.tsx exists and every examples route has matching markdown", () => {
  const grouped = da.listMarkdownSurfaceRoutesGrouped(root);
  const pagePath = join(root, "website", "src", "app", "examples", "[slug]", "page.tsx");
  assert.ok(existsSync(pagePath), `missing ${pagePath}`);
  for (const path of grouped.examples) {
    const seg = String(path).replace(/^\/examples\//, "");
    const mdPath = join(root, "website", "content", "surfaces", "examples", `${seg}.md`);
    assert.ok(existsSync(mdPath), `missing markdown for ${path}: ${mdPath}`);
  }
});

test("compare/[slug]/page.tsx exists and every compare route has matching markdown", () => {
  const grouped = da.listMarkdownSurfaceRoutesGrouped(root);
  const pagePath = join(root, "website", "src", "app", "compare", "[slug]", "page.tsx");
  assert.ok(existsSync(pagePath), `missing ${pagePath}`);
  for (const path of grouped.compare) {
    const seg = String(path).replace(/^\/compare\//, "");
    const mdPath = join(root, "website", "content", "surfaces", "compare", `${seg}.md`);
    assert.ok(existsSync(mdPath), `missing markdown for ${path}: ${mdPath}`);
  }
});
