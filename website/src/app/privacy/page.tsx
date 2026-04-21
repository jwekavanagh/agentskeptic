import { readFileSync } from "node:fs";
import path from "node:path";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadLegalMetadata } from "@/lib/plans";
import { indexableGuideCanonical } from "@/lib/indexableGuides";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AgentSkeptic",
  description:
    "How AgentSkeptic processes account email, billing metadata via Stripe, and usage counters required to enforce plan limits.",
  alternates: { canonical: indexableGuideCanonical("/privacy") },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const meta = loadLegalMetadata();
  const mdPath = path.join(process.cwd(), "content", "legal", "privacy.md");
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
