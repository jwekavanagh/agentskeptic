import { readFileSync } from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadLegalMetadata } from "@/lib/plans";
import { indexableGuideCanonical } from "@/lib/indexableGuides";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — AgentSkeptic",
  description: "Terms governing use of the AgentSkeptic website, commercial services, and related offerings.",
  alternates: { canonical: indexableGuideCanonical("/terms") },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  const meta = loadLegalMetadata();
  const mdPath = path.join(process.cwd(), "content", "legal", "terms.md");
  let body = readFileSync(mdPath, "utf8");
  body = body
    .replace(/\{\{EFFECTIVE_DATE\}\}/g, meta.effectiveDate)
    .replace(/\{\{TERMS_VERSION\}\}/g, meta.termsVersion);
  return (
    <main className="integrate-main">
      <article className="integrate-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </article>
    </main>
  );
}
