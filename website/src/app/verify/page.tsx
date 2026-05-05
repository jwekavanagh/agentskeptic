import { indexableGuideCanonical } from "@/lib/indexableGuides";
import type { Metadata } from "next";
import { VerifyPageClient } from "./VerifyPageClient";

export const metadata: Metadata = {
  title: "Paste verification — AgentSkeptic",
  description:
    "Paste an NDJSON agent event log; AgentSkeptic checks downstream state and produces a decision-grade verdict. Try the sample failure for free.",
  alternates: { canonical: indexableGuideCanonical("/verify") },
};

export default function VerifyPage() {
  return (
    <main className="claim-page-main">
      <VerifyPageClient />
    </main>
  );
}
