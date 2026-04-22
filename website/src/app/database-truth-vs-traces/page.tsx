import { DiscoveryArticleJsonLd } from "@/components/discovery/DiscoveryArticleJsonLd";
import marketing from "@/lib/marketing";
import { indexableGuideCanonical } from "@/lib/indexableGuides";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: marketing.pageMetadata.title,
  description: marketing.pageMetadata.description,
  alternates: { canonical: indexableGuideCanonical(marketing.slug) },
  robots: { index: true, follow: true },
};

export default function DatabaseTruthVsTracesPage() {
  const { visitorProblemAnswer, shareableTerminalDemo, heroTitle, heroSubtitle, briefSections } = marketing;

  return (
    <main className="integrate-main">
      <DiscoveryArticleJsonLd
        headline={heroTitle}
        description={marketing.pageMetadata.description}
        path={marketing.slug}
      />
      <h1 data-testid="acquisition-hero-title">{heroTitle}</h1>
      <p className="lede">{heroSubtitle}</p>
      <div data-testid="visitor-problem-answer">
        {visitorProblemAnswer.split(/\n\n+/).filter(Boolean).map((p) => (
          <p key={p.slice(0, 64)} className="lede">
            {p}
          </p>
        ))}
      </div>
      <section
        className="home-section"
        data-testid="acquisition-terminal-demo"
        aria-labelledby="terminal-demo-heading"
      >
        <h2 id="terminal-demo-heading">{shareableTerminalDemo.title}</h2>
        <pre className="truth-report-pre">{shareableTerminalDemo.transcript}</pre>
      </section>
      {briefSections.map((section) => (
        <section key={section.heading} className="home-section">
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>
      ))}
    </main>
  );
}
