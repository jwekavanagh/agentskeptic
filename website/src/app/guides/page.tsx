import { learnHub, productCopy } from "@/content/productCopy";
import { indexableGuideCanonical } from "@/lib/indexableGuides";
import { listAllSurfaces } from "@/lib/surfaceMarkdown";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Learn — AgentSkeptic",
  description: productCopy.learnHubIndexDescription,
  robots: { index: true, follow: true },
  alternates: { canonical: indexableGuideCanonical("/guides") },
};

const exampleLinkLabels = learnHub.exampleLinkLabels as Readonly<Record<string, string>>;

export default function GuidesHubPage() {
  const surfaces = listAllSurfaces();
  const examples = surfaces
    .filter((s) => s.route.startsWith("/examples/"))
    .sort((a, b) => {
      const order = (r: string) =>
        r.includes("wf-complete") ? 0 : r.includes("wf-missing") ? 1 : r.includes("langgraph") ? 2 : 3;
      return order(a.route) - order(b.route) || a.route.localeCompare(b.route);
    });

  const bundledMuted = productCopy.learnBundledProofLedes.secondaryMuted.trim();

  return (
    <main className="integrate-main">
      <h1>Learn</h1>
      <p className="lede">{productCopy.learnHubPrimaryLede}</p>
      <p className="lede">{productCopy.guidesHubSupportingSentence}</p>
      <p className="lede">{productCopy.guidesHubBridgeSentence}</p>

      <section aria-labelledby="learn-popular-heading">
        <h2 id="learn-popular-heading">{learnHub.popularHeading}</h2>
        <ul className="mechanism-list guide-hub-list">
          {learnHub.popular.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="guide-hub-link">
                <span className="guide-hub-link-title">{g.title}</span>
                <span className="muted guide-hub-link-caption">{g.caption}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="learn-debug-heading">
        <h2 id="learn-debug-heading">{learnHub.debugHeading}</h2>
        <ul className="mechanism-list guide-hub-list">
          {learnHub.debug.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="guide-hub-link">
                <span className="guide-hub-link-title">{g.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="learn-buyers-heading">
        <h2 id="learn-buyers-heading">{learnHub.buyersHeading}</h2>
        <ul className="mechanism-list guide-hub-list">
          {learnHub.buyers.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="guide-hub-link">
                <span className="guide-hub-link-title">{g.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="bundled-proof" className="home-section" aria-labelledby="bundled-proof-heading">
        <h2 id="bundled-proof-heading">{learnHub.bundledProofHeading}</h2>
        <p className="lede">{productCopy.learnBundledProofLedes.primary}</p>
        {bundledMuted ? <p className="lede muted">{bundledMuted}</p> : null}
        <ul className="mechanism-list guide-hub-list">
          {examples.map((e) => (
            <li key={e.route}>
              <Link href={e.route} className="guide-hub-link">
                <span className="guide-hub-link-title">{exampleLinkLabels[e.route] ?? e.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section" aria-labelledby="learn-closing-heading">
        <h2 id="learn-closing-heading">{learnHub.closingTitle}</h2>
        <ul className="mechanism-list guide-hub-list">
          <li>
            <Link href="/integrate" className="guide-hub-link">
              <span className="guide-hub-link-title">{learnHub.getStartedCtaLabel}</span>
            </Link>
          </li>
          <li>
            <Link href="/#try-it" className="guide-hub-link">
              <span className="guide-hub-link-title">{learnHub.tryDemoCtaLabel}</span>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
