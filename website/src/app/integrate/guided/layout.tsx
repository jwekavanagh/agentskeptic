import { indexableGuideCanonical } from "@/lib/indexableGuides";
import { brandedMarketingTitle, marketingOpenGraphAndTwitter } from "@/lib/marketingSocialMetadata";
import type { Metadata } from "next";

const title = "Guided first verification";
const socialTitle = brandedMarketingTitle(title);
const description =
  "Generate a tools.json draft and quick-ingest input in one step, then run a single local verify command—no separate synthesis.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: indexableGuideCanonical("/integrate/guided") },
  robots: { index: true, follow: true },
  ...marketingOpenGraphAndTwitter({
    title: socialTitle,
    description,
  }),
};

export default function IntegrateGuidedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
