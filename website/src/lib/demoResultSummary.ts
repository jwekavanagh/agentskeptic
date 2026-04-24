import { DEMO_SCENARIO_PRESENTATION, type DemoScenarioId } from "@/lib/demoScenarios";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Static story + certificate-backed verdict for the Try-it summary card. */
export function buildDemoResultSummary(
  certificate: unknown,
  scenarioId: DemoScenarioId,
):
  | {
      scenario: string;
      reality: string;
      verdictLine: string;
      whyItMatters: string;
    }
  | null {
  if (!isRecord(certificate)) return null;
  const rel = certificate.stateRelation;
  if (rel !== "matches_expectations" && rel !== "does_not_match" && rel !== "not_established") {
    return null;
  }
  const passed = rel === "matches_expectations";
  const ex = isRecord(certificate.explanation) ? certificate.explanation : null;
  const details = ex && Array.isArray(ex.details) ? ex.details : [];
  const d0 = details[0] && isRecord(details[0]) ? details[0] : null;
  const firstCode = typeof d0?.code === "string" ? d0.code : undefined;
  const headline =
    ex && typeof ex.headline === "string" && ex.headline.trim().length > 0
      ? ex.headline.trim()
      : "";
  const steps = Array.isArray(certificate.steps) ? certificate.steps : [];
  const s0 = steps[0] && isRecord(steps[0]) ? steps[0] : null;
  const obs = typeof s0?.observedOutcome === "string" ? s0.observedOutcome.trim() : "";
  const pres = DEMO_SCENARIO_PRESENTATION[scenarioId];

  const scenario =
    scenarioId === "wf_missing"
      ? "Agent claimed it updated a CRM contact."
      : `Scenario: ${pres.label}.`;

  let reality: string;
  if (passed) {
    reality =
      obs && obs.length > 0 && obs.length < 500
        ? obs
        : "Downstream state matches the expectations under the demo registry.";
  } else if (scenarioId === "wf_missing" && firstCode === "ROW_ABSENT") {
    reality = "No matching row exists for that contact.";
  } else {
    reality =
      obs && obs.length > 0 && obs.length < 500
        ? obs
        : firstCode
          ? "State check failed (see the full report for detail)."
          : "Expected and observed state do not match under the registry.";
  }

  const verdict = passed ? "PASSED" : "FAILED";
  const verdictLine = firstCode ? `${verdict} — ${firstCode}` : verdict;

  let whyItMatters: string;
  if (headline) {
    whyItMatters = headline;
  } else if (passed) {
    whyItMatters = "The demo run shows a green path you can compare to your own fixtures.";
  } else if (scenarioId === "wf_missing") {
    whyItMatters = "The workflow looked green, but the customer record was never written.";
  } else {
    whyItMatters = pres.oneLiner;
  }

  return { scenario, reality, verdictLine, whyItMatters };
}
