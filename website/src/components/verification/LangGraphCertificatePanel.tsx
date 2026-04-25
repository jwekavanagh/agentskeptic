import type { ReactNode } from "react";

const TRUNC = 240;

export type LangGraphCertLike = {
  workflowId: string;
  stateRelation: string;
  highStakesReliance: string;
  relianceRationale: string;
  intentSummary?: string;
  explanation: { headline: string; details: { code: string; message: string }[] };
  checkpointVerdicts?: {
    checkpointKey: string;
    verdict: string;
    productionMeaning: string;
    seqs: number[];
  }[];
};

function trunc(s: string): string {
  if (s.length <= TRUNC) return s;
  return `${s.slice(0, TRUNC - 1)}…`;
}

type PanelProps = { certificate: LangGraphCertLike };

export function LangGraphCertificatePanel({ certificate }: PanelProps) {
  const c = certificate;
  const hasRollups = Array.isArray(c.checkpointVerdicts) && c.checkpointVerdicts.length > 0;
  return (
    <div className="home-section" data-testid="langgraph-certificate-panel" aria-label="LangGraph checkpoint trust">
      <h2 className="verification-report-embed-title">
        LangGraph checkpoint trust
        <span className="muted"> {c.stateRelation}</span>
      </h2>
      <div className="muted" style={{ marginBottom: "0.75rem" }}>
        <div>
          <strong>workflowId</strong> <code>{c.workflowId}</code>
        </div>
        <div>
          <strong>stateRelation</strong> {c.stateRelation}
        </div>
        <div>
          <strong>highStakesReliance</strong> {c.highStakesReliance}
        </div>
        <p style={{ marginTop: "0.5rem" }}>{trunc(c.relianceRationale)}</p>
      </div>
      <section aria-labelledby="lg-explanation">
        <h3 id="lg-explanation" className="muted" style={{ fontSize: "0.95rem" }}>
          Explanation
        </h3>
        <p>
          <strong>{c.explanation.headline}</strong>
        </p>
        {c.explanation.details.length > 0 ? (
          <ul>
            {c.explanation.details.map((d) => (
              <li key={`${d.code}-${d.message.slice(0, 40)}`}>
                <code>{d.code}</code>: {d.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section aria-labelledby="lg-rollups">
        <h3 id="lg-rollups" className="muted" style={{ fontSize: "0.95rem" }}>
          Checkpoint rollups
        </h3>
        {!hasRollups ? (
          <p className="muted">No checkpoint rollups; see explanation above.</p>
        ) : (
          <table data-testid="langgraph-checkpoint-table">
            <thead>
              <tr>
                <th>Checkpoint key</th>
                <th>Verdict</th>
                <th>Production meaning</th>
                <th>Seq</th>
              </tr>
            </thead>
            <tbody>
              {c.checkpointVerdicts!.map((row) => (
                <tr key={row.checkpointKey}>
                  <td>
                    <code>{row.checkpointKey}</code>
                  </td>
                  <td>{row.verdict}</td>
                  <td>{row.productionMeaning}</td>
                  <td>
                    <code>{row.seqs.join(", ")}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function isLangGraphCertificate(
  c: unknown,
): c is LangGraphCertLike {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return o.runKind === "contract_sql_langgraph_checkpoint_trust";
}

export function maybeLangGraphPanelFromCertificate(certificate: unknown): ReactNode {
  if (!isLangGraphCertificate(certificate)) return null;
  return <LangGraphCertificatePanel certificate={certificate} />;
}
