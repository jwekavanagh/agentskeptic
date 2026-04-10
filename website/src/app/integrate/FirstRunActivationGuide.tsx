import { readFileSync } from "node:fs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolvePartnerQuickstartCommandsMd } from "@/lib/resolveRepoDoc";

/**
 * Renders generated docs/partner-quickstart-commands.md only (no hardcoded commands in TSX).
 */
export function FirstRunActivationGuide() {
  const resolved = resolvePartnerQuickstartCommandsMd();
  if (!resolved) {
    return (
      <section className="integrate-guide" role="alert">
        <h2>Partner quickstart commands unavailable</h2>
        <p className="muted">
          The file <code>docs/partner-quickstart-commands.md</code> was not found. For Vercel or monorepo
          deploys, set <code>NEXT_CONFIG_TRACE_ROOT=1</code> so the repo root (including{" "}
          <code>docs/</code>) is included in the server bundle trace.
        </p>
      </section>
    );
  }
  const md = readFileSync(resolved, "utf8");
  return (
    <section className="integrate-guide" aria-labelledby="integrate-guide-heading">
      <h2 id="integrate-guide-heading">Partner quickstart (commands)</h2>
      <p className="muted">
        Same content as <code>docs/partner-quickstart-commands.md</code> — sole SSOT for copy-paste shell
        commands. Narrative and guarantees follow below.
      </p>
      <article className="integrate-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </article>
    </section>
  );
}
