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
      <p className="lede integrate-benefit-lede">
        <strong>{siteMetadata.integrate.description}</strong>
      </p>
      <p className="lede">
        Run a single verification that compares what your agents and tools claimed against your actual stored state.
      </p>
      <p className="lede">
        Get a clear, binary verdict before you ship, bill, or hand off to customers.
      </p>

      <h2>Fastest path (pack-led)</h2>
      <pre className="integrate-pack-command">{p.packLedCommand}</pre>
      <p>This one command does three things:</p>
      <ul>
        <li>Reads your structured tool activity (NDJSON)</li>
        <li>
          Maps it against your stores using <code>tools.json</code>
        </li>
        <li>Runs read-only verification and returns a clear result</li>
      </ul>
      <p>
        Success = <code>exit 0</code> with <code>VERDICT: complete</code> and <code>trust: TRUSTED</code>.
      </p>
      <p className="muted">
        Failure surfaces explicit issues like <code>ROW_ABSENT</code> instead of letting silent gaps reach production.
      </p>

      <h2>Requirements</h2>
      <ul>
        {p.requirements.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h2>What success looks like</h2>
      <p>You&apos;ll see output like the bundled demo:</p>
      <ul>
        <li>
          <code>VERDICT: complete</code> + <code>trust: TRUSTED</code>
        </li>
        <li>Every step marked &quot;verified&quot; or &quot;matched&quot;</li>
      </ul>
      <p className="muted">
        If anything is wrong, you get an immediate, actionable failure (e.g. <code>ROW_ABSENT</code>) — no more
        silent green traces hiding bad data.
      </p>

      <h2>Next steps</h2>
      <ol>
        <li>
          <Link href="/#try-it">Try the interactive demo on the homepage</Link> (no account required)
        </li>
        <li>Run the command above on your own data</li>
        <li>
          <Link href="/guides">Follow the full first-run guide in the Learn section</Link> for deeper integration
        </li>
      </ol>

      <h2>Full documentation</h2>
      <p>
        <a href={p.githubDeepLink} rel="noopener noreferrer" target="_blank" data-testid="integrate-gh-deep-link">
          Crossing contract
        </a>{" "}
        ·{" "}
        <a href={p.githubFirstRunLink} rel="noopener noreferrer" target="_blank" data-testid="integrate-gh-first-run">
          First-run integration
        </a>{" "}
        · <Link href="/guides">Learn hub</Link>
      </p>
    </main>
  );
}
