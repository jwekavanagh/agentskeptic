import marketing from "@/lib/marketing";
import { siteMetadata } from "@/content/siteMetadata";
import { indexableGuideCanonical } from "@/lib/indexableGuides";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: siteMetadata.integrate.title,
  description: siteMetadata.integrate.description,
  alternates: { canonical: indexableGuideCanonical("/integrate") },
  robots: { index: true, follow: true },
};

export default function IntegratePage() {
  const p = marketing.integratePage;
  return (
    <main className="integrate-main integrate-prose" data-testid="integrate-page">
      <h1>{siteMetadata.integrate.title}</h1>
      <p className="muted">{siteMetadata.integrate.description}</p>
      <h2>Run pack-led crossing</h2>
      <p className="lede">Compare NDJSON tool lines and your registry to read-only state in one pass.</p>
      <pre className="integrate-pack-command">{p.packLedCommand}</pre>
      <h2>Requirements</h2>
      <ul>
        {p.requirements.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h2>What a successful run means</h2>
      <p className="muted">{p.proofLine}</p>
      <h2>Full documentation</h2>
      <p>
        <a href={p.githubDeepLink} rel="noopener noreferrer" target="_blank" data-testid="integrate-gh-deep-link">
          Crossing contract (normative)
        </a>{" "}
        ·{" "}
        <a href={p.githubFirstRunLink} rel="noopener noreferrer" target="_blank" data-testid="integrate-gh-first-run">
          First-run integration
        </a>
        {" — "}
        <Link href="/guides">Learn hub</Link>
        {" · "}
        <Link href="/pricing">Pricing</Link>
      </p>
    </main>
  );
}
