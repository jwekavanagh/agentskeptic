import { load } from "cheerio";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Same ReactMarkdown + remark-gfm stack as `DiscoverySurfacePage`. */
export function markdownSurfacePlainText(markdown: string): string {
  const html = renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, markdown),
  );
  const text = load(html).root().text();
  return text.replace(/\s+/g, " ").trim();
}
