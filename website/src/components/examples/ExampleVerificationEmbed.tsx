import { LangGraphCheckpointTrustStories } from "@/components/examples/LangGraphCheckpointTrustStories";
import { VerificationReportView } from "@/components/VerificationReportView";
import { getExampleEmbed } from "@/lib/exampleEmbeds";
import { derivedFieldsFromEnvelope } from "@/lib/publicVerificationReportService";

type Variant = "wf_complete" | "wf_missing" | "langgraph_checkpoint_trust";

const titles: Record<Variant, string> = {
  wf_complete: "Bundled demo: wf_complete (verified)",
  wf_missing: "Bundled demo: wf_missing (ROW_ABSENT)",
  langgraph_checkpoint_trust: "LangGraph checkpoint trust: terminal rows (A2, B, C, D)",
};

const blurbs: Record<Variant, string> = {
  wf_complete:
    "The block below uses the committed public-report envelope for wf_complete so this page stays aligned with the engine.",
  wf_missing:
    "The block below reuses the same bundled wf_missing envelope used on indexable guides so ROW_ABSENT stays consistent.",
  langgraph_checkpoint_trust:
    "Certificates are regenerated from the CLI with `npm run regen:langgraph-embeds` (same contract as `npm run check:langgraph-embeds` in CI).",
};

type Props = {
  variant: Variant;
};

export function ExampleVerificationEmbed({ variant }: Props) {
  if (variant === "langgraph_checkpoint_trust") {
    return (
      <section className="home-section" aria-labelledby={`example-embed-${variant}`}>
        <h2 id={`example-embed-${variant}`}>{titles[variant]}</h2>
        <p className="muted">{blurbs[variant]}</p>
        <LangGraphCheckpointTrustStories />
      </section>
    );
  }
  const embed = getExampleEmbed(variant);
  const { humanText } = derivedFieldsFromEnvelope(embed);
  return (
    <section className="home-section" aria-labelledby={`example-embed-${variant}`}>
      <h2 id={`example-embed-${variant}`}>{titles[variant]}</h2>
      <p className="muted">{blurbs[variant]}</p>
      <VerificationReportView humanText={humanText} payload={embed} variant="embed" />
    </section>
  );
}
