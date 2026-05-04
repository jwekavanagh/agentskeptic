import { DiscoveryArticleJsonLd } from "@/components/discovery/DiscoveryArticleJsonLd";
import { conversionSpine, productCopy } from "@/content/productCopy";
import marketing from "@/lib/marketing";
import { indexableGuideCanonical } from "@/lib/indexableGuides";
import { brandedMarketingTitle, marketingOpenGraphAndTwitter } from "@/lib/marketingSocialMetadata";
import type { Metadata } from "next";
import Link from "next/link";

const problemsDescription = productCopy.problemsPageMetadata.description;
const problemsSegmentTitle = productCopy.problemsPageMetadata.title;
const problemsPublicTitle = brandedMarketingTitle(problemsSegmentTitle);

export const metadata: Metadata = {
  title: problemsSegmentTitle,
  description: problemsDescription,
  alternates: { canonical: indexableGuideCanonical("/problems") },
  robots: { index: true, follow: true },
  ...marketingOpenGraphAndTwitter({
    title: problemsPublicTitle,
    description: problemsDescription,
  }),
};

export default function ProblemsPage() {
  const rows = marketing.problemIndex;
  return (
    <main className="integrate-main">
      <DiscoveryArticleJsonLd
        headline="Problems"
        description={productCopy.problemsPageMetadata.description}
        path="/problems"
        breadcrumbMiddle={{ name: "Learn", path: "/guides" }}
      />
      <h1>Problems</h1>
      <ol className="mechanism-list">
        {rows.map((row, i) => (
          <li key={`${row.primaryRoute}-${i}`}>
            <p>
              <Link href={row.primaryRoute}>{row.moment}</Link>
            </p>
            <p className="muted">{row.symptom}</p>
          </li>
        ))}
      </ol>
      <p className="home-cta-row">
        <Link
          href="/integrate"
          className="btn"
          data-cta-priority={conversionSpine.ctaPriorityPrimaryValue}
        >
          {productCopy.ctaTaxonomy.decision}
        </Link>
      </p>
    </main>
  );
}
