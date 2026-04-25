import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CompareRunManifestV1, CertificateProfileV1, OutcomeCertificateRunKindForCompare } from "./compareRunManifest.js";
import { loadCompareRunManifest } from "./compareRunManifest.js";
import { certificateCanonicalDigestHex } from "./certificateDigest.js";
import { buildTracePairwisePayload } from "./executionTraceDiff.js";
import { buildExecutionTraceView } from "./executionTrace.js";
import {
  buildOutcomeCertificateFromWorkflowResult,
  buildOutcomeCertificateLangGraphCheckpointTrustFromWorkflowResult,
  type OutcomeCertificateV1,
} from "./outcomeCertificate.js";
import { buildRunComparisonReport, type ReliabilityTrend, type RunComparisonReport } from "./runComparison.js";
import { loadEventsForWorkflow } from "./loadEvents.js";
import { loadSchemaValidator } from "./schemaLoad.js";
import { stringifyWithSortedKeys } from "./sortedJsonStringify.js";
import { CLI_OPERATIONAL_CODES } from "./cliOperationalCodes.js";
import { TruthLayerError } from "./truthLayerError.js";
import type { WorkflowEngineResult, WorkflowResult } from "./types.js";
import { normalizeToEmittedWorkflowResult } from "./workflowResultNormalize.js";
import { isV9RunLevelCodesInconsistent } from "./workflowRunLevelConsistency.js";
import { COMPARE_INPUT_RUN_LEVEL_INCONSISTENT_MESSAGE } from "./runLevelDriftMessages.js";

const DEBUG_CORPUS_PROFILE: CertificateProfileV1 = {
  mode: "uniform",
  outcomeCertificateRunKind: "contract_sql",
} as const;

export type RegressionArtifactV1 = {
  schemaVersion: 1;
  artifactSource: "cli_manifest" | "debug_corpus";
  manifestSha256: string;
  workflowId: string;
  certificateProfile: CertificateProfileV1;
  verification: RunComparisonReport;
  outcomeCertificates: Array<{
    runIndex: number;
    displayLabel: string;
    outcomeCertificateRunKind: OutcomeCertificateRunKindForCompare;
    certificateCanonicalDigest: string;
    certificate: OutcomeCertificateV1;
  }>;
  tracePairwise: ReturnType<typeof buildTracePairwisePayload>;
  narrative: {
    classification: ReliabilityTrend;
    whyItMatters: string;
    headline: string;
    structural: {
      introducedLogicalStepKeysCount: number;
      resolvedLogicalStepKeysCount: number;
      recurringSignatureCount: number;
    };
    traceSummary: {
      seqTimelineOrderDiverged: boolean;
      onlyInPriorSeqCount: number;
      onlyInCurrentSeqCount: number;
      inBothCount: number;
      nonToolCountsDiverged: boolean;
    };
  };
  humanText: string;
  narrativeHtml: string;
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getRunKindForIndex(
  profile: CertificateProfileV1,
  runIndex: number,
): OutcomeCertificateRunKindForCompare {
  if (profile.mode === "uniform") {
    return profile.outcomeCertificateRunKind;
  }
  const ent = profile.entries.find((e) => e.runIndex === runIndex);
  if (!ent) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.INTERNAL_ERROR,
      `regression: missing certificateProfile entry for runIndex ${runIndex}`,
    );
  }
  return ent.outcomeCertificateRunKind;
}

function buildCertificateFor(
  r: WorkflowResult,
  kind: OutcomeCertificateRunKindForCompare,
): OutcomeCertificateV1 {
  try {
    if (kind === "contract_sql") {
      return buildOutcomeCertificateFromWorkflowResult(r, "contract_sql");
    }
    return buildOutcomeCertificateLangGraphCheckpointTrustFromWorkflowResult(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.COMPARE_CERTIFICATE_BUILD_FAILED, msg);
  }
}

function buildWhyItMatters(
  ra: RunComparisonReport["reliabilityAssessment"],
  traceSummary: RegressionArtifactV1["narrative"]["traceSummary"],
  structural: RegressionArtifactV1["narrative"]["structural"],
): string {
  const { windowTrend, pairwiseTrend, headlineVerdict } = ra;
  const introducedN = structural.introducedLogicalStepKeysCount;
  const { seqTimelineOrderDiverged, nonToolCountsDiverged } = traceSummary;
  if (headlineVerdict === "worsening") {
    let s = `Overall reliability worsened over the run window: window=${windowTrend}, pairwise hop=${pairwiseTrend}.`;
    if (introducedN > 0) s += " There are introduced verification failures.";
    if (nonToolCountsDiverged) s += " Control-path event counts differ between runs.";
    if (seqTimelineOrderDiverged) s += " Tool step order changed between runs.";
    return s;
  }
  if (headlineVerdict === "improving") {
    let s = `Overall reliability improved over the run window: window=${windowTrend}, pairwise hop=${pairwiseTrend}.`;
    if (introducedN > 0) s += " There are introduced verification failures.";
    if (nonToolCountsDiverged) s += " Control-path event counts differ between runs.";
    if (seqTimelineOrderDiverged) s += " Tool step order changed between runs.";
    return s;
  }
  if (headlineVerdict === "unchanged") {
    let s = `No headline shift in the reliability assessment: window=${windowTrend}, pairwise=${pairwiseTrend}.`;
    if (introducedN > 0) s += " There are introduced verification failures.";
    if (nonToolCountsDiverged) s += " Control-path event counts differ between runs.";
    if (seqTimelineOrderDiverged) s += " Tool step order changed between runs.";
    return s;
  }
  return `Mixed signal: window=${windowTrend}, pairwise=${pairwiseTrend}; see headline rationale in narrative.headline.`;
}

function nonToolCountsDiverged(a: Record<string, number>, b: Record<string, number>): boolean {
  return stringifyWithSortedKeys(a) !== stringifyWithSortedKeys(b);
}

export function buildRegressionArtifactFromInputs(options: {
  artifactSource: "cli_manifest" | "debug_corpus";
  manifestSha256: string;
  certificateProfile: CertificateProfileV1;
  results: WorkflowResult[];
  displayLabels: string[];
  /** NDJSON event paths, same order as results */
  eventPaths: string[];
}): RegressionArtifactV1 {
  const { artifactSource, manifestSha256, certificateProfile, results, displayLabels, eventPaths } = options;
  if (results.length !== displayLabels.length || results.length !== eventPaths.length) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.INTERNAL_ERROR,
      "regression: results, displayLabels, eventPaths length mismatch",
    );
  }
  if (displayLabels.length < 2) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.COMPARE_INSUFFICIENT_RUNS,
      "At least two runs required for compare",
    );
  }
  if (artifactSource === "debug_corpus" && JSON.stringify(certificateProfile) !== JSON.stringify(DEBUG_CORPUS_PROFILE)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.INTERNAL_ERROR,
      "regression: debug_corpus must use contract_sql uniform profile",
    );
  }

  const verification = buildRunComparisonReport(results, displayLabels);
  const ra = verification.reliabilityAssessment;
  const ch = verification.compareHighlights;
  const priorIdx = verification.pairwise.priorRunIndex;
  const currentIdx = verification.pairwise.currentRunIndex;

  const outcomeCertificates = results.map((r, i) => {
    const k = getRunKindForIndex(certificateProfile, i);
    const cert = buildCertificateFor(r, k);
    return {
      runIndex: i,
      displayLabel: displayLabels[i]!,
      outcomeCertificateRunKind: k,
      certificateCanonicalDigest: certificateCanonicalDigestHex(cert),
      certificate: cert,
    };
  });

  let priorLoad: ReturnType<typeof loadEventsForWorkflow>;
  let currentLoad: ReturnType<typeof loadEventsForWorkflow>;
  try {
    priorLoad = loadEventsForWorkflow(eventPaths[priorIdx]!, results[priorIdx]!.workflowId);
    currentLoad = loadEventsForWorkflow(eventPaths[currentIdx]!, results[currentIdx]!.workflowId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.COMPARE_EVENTS_LOAD_FAILED, msg);
  }
  const priorView = buildExecutionTraceView({
    workflowId: results[priorIdx]!.workflowId,
    runEvents: priorLoad.runEvents,
    malformedEventLineCount: priorLoad.malformedEventLineCount,
    workflowResult: results[priorIdx]!,
  });
  const currentView = buildExecutionTraceView({
    workflowId: results[currentIdx]!.workflowId,
    runEvents: currentLoad.runEvents,
    malformedEventLineCount: currentLoad.malformedEventLineCount,
    workflowResult: results[currentIdx]!,
  });

  const traceDiff = buildTracePairwisePayload({
    priorView,
    currentView,
    priorRunIndex: priorIdx,
    currentRunIndex: currentIdx,
  });
  const ntd = nonToolCountsDiverged(
    traceDiff.nonToolEventCounts.prior,
    traceDiff.nonToolEventCounts.current,
  );
  const onlyInPrior = traceDiff.bySeq.filter((r) => r.class === "only_in_prior").length;
  const onlyInCurrent = traceDiff.bySeq.filter((r) => r.class === "only_in_current").length;
  const inBoth = traceDiff.bySeq.filter((r) => r.class === "in_both").length;
  const structural = {
    introducedLogicalStepKeysCount: ch.introducedLogicalStepKeys.length,
    resolvedLogicalStepKeysCount: ch.resolvedLogicalStepKeys.length,
    recurringSignatureCount: verification.recurrence.patterns.length,
  };
  const traceSummary: RegressionArtifactV1["narrative"]["traceSummary"] = {
    seqTimelineOrderDiverged: traceDiff.seqTimelineOrderDiverged,
    onlyInPriorSeqCount: onlyInPrior,
    onlyInCurrentSeqCount: onlyInCurrent,
    inBothCount: inBoth,
    nonToolCountsDiverged: ntd,
  };
  const whyItMatters = buildWhyItMatters(ra, traceSummary, structural);
  const narrative: RegressionArtifactV1["narrative"] = {
    classification: ra.headlineVerdict,
    whyItMatters,
    headline: ra.headlineRationale,
    structural,
    traceSummary,
  };

  const tracePairwise: RegressionArtifactV1["tracePairwise"] = traceDiff;

  const workflowId = verification.workflowId;
  const artifact: RegressionArtifactV1 = {
    schemaVersion: 1,
    artifactSource,
    manifestSha256,
    workflowId,
    certificateProfile,
    verification,
    outcomeCertificates,
    tracePairwise,
    narrative,
    humanText: "",
    narrativeHtml: "",
  };
  artifact.humanText = buildRegressionArtifactHumanText(artifact);
  artifact.narrativeHtml = buildRegressionArtifactNarrativeHtml(artifact);
  const validate = loadSchemaValidator("regression-artifact-v1");
  if (!validate(artifact as unknown as object)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.COMPARE_REGRESSION_ARTIFACT_INVALID,
      JSON.stringify(validate.errors ?? []),
    );
  }
  return artifact;
}

function buildRegressionArtifactHumanText(a: RegressionArtifactV1): string {
  const lines: string[] = [];
  lines.push(`regression_artifact: workflowId=${a.workflowId} classification=${a.narrative.classification}`);
  lines.push(`headline: ${a.narrative.headline}`);
  lines.push(`why_it_matters: ${a.narrative.whyItMatters}`);
  lines.push("outcome_certificates:");
  for (const c of a.outcomeCertificates) {
    lines.push(
      `  run ${c.runIndex} label=${c.displayLabel} kind=${c.outcomeCertificateRunKind} digest=${c.certificateCanonicalDigest} state=${c.certificate.stateRelation}`,
    );
  }
  lines.push("trace_pairwise: priorRunIndex=" + String(a.tracePairwise.priorRunIndex) + " currentRunIndex=" + String(a.tracePairwise.currentRunIndex));
  lines.push("verification: embedded in JSON field `verification` (RunComparisonReport v4).");
  return lines.join("\n");
}

function buildRegressionArtifactNarrativeHtml(a: RegressionArtifactV1): string {
  const ra = a.narrative;
  return [
    `<section data-etl-section="regression-artifact">`,
    `<h2 data-etl-regression-classification>Classification: ${escapeHtml(ra.classification)}</h2>`,
    `<p data-etl-regression-headline>${escapeHtml(ra.headline)}</p>`,
    `<p data-etl-why-matters>${escapeHtml(ra.whyItMatters)}</p>`,
    `</section>`,
  ].join("");
}

export function stringifyRegressionArtifact(artifact: RegressionArtifactV1): string {
  return stringifyWithSortedKeys(artifact);
}

function sha256FileHex(absPath: string): string {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

export function buildRegressionArtifactFromCompareManifest(
  manifestPath: string,
): { artifact: RegressionArtifactV1; manifest: CompareRunManifestV1; manifestFileAbs: string } {
  const { manifest, baseDirAbs, manifestFileAbs } = loadCompareRunManifest(manifestPath);
  const validateCompareInput = loadSchemaValidator("workflow-result-compare-input");
  const results: WorkflowResult[] = [];
  const eventPaths: string[] = [];
  for (const run of manifest.runs) {
    const wrAbs = path.resolve(baseDirAbs, run.workflowResult);
    const evAbs = path.resolve(baseDirAbs, run.events);
    if (!existsSync(wrAbs) || !existsSync(evAbs)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.COMPARE_RESOLVE_PATH_FAILED,
        `Missing file: ${!existsSync(wrAbs) ? wrAbs : evAbs}`,
      );
    }
    const raw = readFileSync(wrAbs, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.COMPARE_INPUT_JSON_SYNTAX, m);
    }
    if (isV9RunLevelCodesInconsistent(parsed)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.COMPARE_INPUT_RUN_LEVEL_INCONSISTENT,
        COMPARE_INPUT_RUN_LEVEL_INCONSISTENT_MESSAGE,
      );
    }
    if (!validateCompareInput(parsed)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.COMPARE_INPUT_SCHEMA_INVALID,
        JSON.stringify(validateCompareInput.errors ?? []),
      );
    }
    try {
      results.push(
        normalizeToEmittedWorkflowResult(parsed as WorkflowEngineResult | WorkflowResult),
      );
    } catch (e) {
      if (e instanceof TruthLayerError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      throw new TruthLayerError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, msg);
    }
    eventPaths.push(evAbs);
  }
  const wf0 = results[0]!.workflowId;
  for (const r of results) {
    if (r.workflowId !== wf0) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.COMPARE_WORKFLOW_ID_MISMATCH,
        "All WorkflowResult inputs must share the same workflowId.",
      );
    }
  }
  const dig = sha256FileHex(manifestFileAbs);
  const artifact = buildRegressionArtifactFromInputs({
    artifactSource: "cli_manifest",
    manifestSha256: dig,
    certificateProfile: manifest.certificateProfile,
    results,
    displayLabels: manifest.runs.map((r) => r.displayLabel),
    eventPaths,
  });
  return { artifact, manifest, manifestFileAbs };
}

/** Debug / corpus: `manifestSha256` = 64x `0` per normative contract. */
export const DEBUG_MANIFEST_SHA256_PLACEHOLDER = "0".repeat(64);

export function buildRegressionArtifactFromDebugCorpus(
  options: {
    results: WorkflowResult[];
    runIds: string[];
    eventPaths: string[];
  },
): RegressionArtifactV1 {
  if (options.results.length !== options.runIds.length || options.results.length !== options.eventPaths.length) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.INTERNAL_ERROR, "regression: debug length mismatch");
  }
  return buildRegressionArtifactFromInputs({
    artifactSource: "debug_corpus",
    manifestSha256: DEBUG_MANIFEST_SHA256_PLACEHOLDER,
    certificateProfile: DEBUG_CORPUS_PROFILE,
    results: options.results,
    displayLabels: options.runIds,
    eventPaths: options.eventPaths,
  });
}
