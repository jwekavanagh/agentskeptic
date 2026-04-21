import { indexableGuideCanonical } from "@/lib/indexableGuides";
import { listAllSurfaces } from "@/lib/surfaceMarkdown";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compare approaches — AgentSkeptic",
  description:
    "Evaluation-oriented comparisons between trace-only review, offline evals, observability dashboards, and read-only SQL verification gates.",
  robots: { index: true, follow: true },
  alternates: { canonical: indexableGuideCanonical("/compare") },
};

export default function CompareHubPage() {
  const comparisons = listAllSurfaces().filter((s) => s.surfaceKind === "comparison");
  return (
    <main className="integrate-main">
      <h1>Compare approaches</h1>
      <p className="lede">
        Short, evaluator-focused pages that contrast common reliability patterns with read-only SQL verification at
        decision time.
      </p>
      <ul className="mechanism-list guide-hub-list">
        {comparisons.map((s) => (
          <li key={s.route}>
            <Link href={s.route} className="guide-hub-link">
              <span className="guide-hub-link-title">{s.title}</span>
              <span className="muted guide-hub-link-caption">{s.valueProposition}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
