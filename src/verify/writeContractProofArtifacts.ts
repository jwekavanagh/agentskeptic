import { readFileSync } from "node:fs";
import type { WorkflowResult } from "../types.js";
import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";
import { writeRunBundleCli } from "../writeRunBundleCli.js";
import { writeDecisionEvidenceBundle } from "../decisionEvidenceBundle/index.js";
import { randomUUID } from "node:crypto";

/**
 * Writes `proof/run/` (technical run bundle) and `proof/decision/` (decision evidence bundle) from an already-valid contract verify outcome.
 */
export function writeContractProofArtifacts(args: {
  proofRunDir: string;
  proofDecisionDir: string;
  eventsPath: string;
  workflowResult: WorkflowResult;
  certificate: OutcomeCertificateV1;
  runBundleSignKeyPath?: string | undefined;
  /** When set, signs the decision-bundle manifest with the same PKCS#8 PEM key bytes. */
  decisionBundleSignKeyPemUtf8?: string | undefined;
}): void {
  const eventsNdjson = readFileSync(args.eventsPath);
  writeRunBundleCli(args.proofRunDir, eventsNdjson, args.workflowResult, args.runBundleSignKeyPath);
  writeDecisionEvidenceBundle({
    outDir: args.proofDecisionDir,
    certificate: args.certificate,
    noHumanReport: false,
    runId: randomUUID(),
    ...(args.decisionBundleSignKeyPemUtf8 !== undefined
      ? { signingPrivateKeyPemUtf8: args.decisionBundleSignKeyPemUtf8 }
      : {}),
  });
}
