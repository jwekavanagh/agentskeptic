"use client";

import { useState } from "react";
import a2Cert from "@/content/embeddedReports/langgraph-lct-a2-ineligible.v1.json";
import bCert from "@/content/embeddedReports/langgraph-lct-b-verified.v1.json";
import cCert from "@/content/embeddedReports/langgraph-lct-c-mismatch.v1.json";
import dCert from "@/content/embeddedReports/langgraph-lct-d-incomplete.v1.json";
import { VerificationReportView } from "@/components/VerificationReportView";
import type { PublicReportEnvelope } from "@/lib/publicVerificationReportService";

const STORIES: { id: "a2" | "b" | "c" | "d"; label: string; cert: typeof bCert; testId: string }[] = [
  { id: "a2", label: "A2 Ineligible", cert: a2Cert as typeof bCert, testId: "langgraph-lct-tab-a2" },
  { id: "b", label: "B Verified", cert: bCert as typeof bCert, testId: "langgraph-lct-tab-b" },
  { id: "c", label: "C Mismatch", cert: cCert as typeof bCert, testId: "langgraph-lct-tab-c" },
  { id: "d", label: "D Incomplete", cert: dCert as typeof bCert, testId: "langgraph-lct-tab-d" },
];

function toV2Envelope(cert: typeof bCert): PublicReportEnvelope {
  return {
    schemaVersion: 2,
    certificate: cert as unknown as Record<string, unknown>,
  };
}

export function LangGraphCheckpointTrustStories() {
  const [active, setActive] = useState<(typeof STORIES)[0]["id"]>("a2");
  const story = STORIES.find((s) => s.id === active) ?? STORIES[0]!;
  const humanText = typeof story.cert.humanReport === "string" ? story.cert.humanReport : "";

  return (
    <div className="home-section" data-testid="langgraph-lct-stories">
      <div role="tablist" aria-label="LangGraph checkpoint trust outcomes" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {STORIES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === s.id}
            data-testid={s.testId}
            className={active === s.id ? "btn" : "btn secondary"}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <VerificationReportView humanText={humanText} payload={toV2Envelope(story.cert)} variant="embed" />
    </div>
  );
}
