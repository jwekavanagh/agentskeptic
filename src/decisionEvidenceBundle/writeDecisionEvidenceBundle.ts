import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteUtf8File } from "../quickVerify/atomicWrite.js";
import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";
import { loadSchemaValidator } from "../schemaLoad.js";
import { TruthLayerError } from "../truthLayerError.js";
import { CLI_OPERATIONAL_CODES, formatOperationalMessage } from "../failureCatalog.js";
import { buildHumanLayerFileJson } from "../decisionEvidenceHumanLayer.js";
import { materialTruthProjectionFromCertificate } from "../governanceEvidence.js";
import { signCanonicalBytesEd25519 } from "../signCanonicalBytesEd25519.js";
import { fingerprintUtf8JsonFileBytes, lineUtf8JsonFileBytes } from "./canonicalBytes.js";
import { DECISION_EVIDENCE_FILES } from "./constants.js";
import { exitCodeFromOutcomeCertificate } from "./exitCode.js";
import {
  computeCompletenessFromParts,
  type DecisionEvidenceCompleteness,
} from "./completeness.js";

function readPackageIdentity(): { name: string; version: string } {
  const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { name?: string; version?: string };
  const name = typeof pkg.name === "string" && pkg.name.length > 0 ? pkg.name : "agentskeptic";
  const version = typeof pkg.version === "string" && pkg.version.length > 0 ? pkg.version : "0.0.0";
  return { name, version };
}

export type WriteDecisionEvidenceBundleOptions = {
  outDir: string;
  certificate: OutcomeCertificateV1;
  noHumanReport: boolean;
  runId?: string;
  producer?: { name: string; version: string };
  /** Validated against decision-evidence-attestation-v1 when present. */
  attestation?: unknown;
  /** Validated against decision-evidence-next-action-v1 when present. */
  nextAction?: unknown;
  /** Override createdAt timestamp (fixtures / tests); otherwise `new Date().toISOString()`. */
  createdAt?: string;
  /**
   * When set, emit `manifest.sig.json` next to `manifest.json` produced by
   * {@link signCanonicalBytesEd25519} over the canonicalised manifest bytes.
   */
  signingPrivateKeyPemUtf8?: string;
};

function validateOptional(schemaName: Parameters<typeof loadSchemaValidator>[0], label: string, value: unknown): void {
  const v = loadSchemaValidator(schemaName);
  if (!v(value)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.CLI_USAGE,
      formatOperationalMessage(`${label}: ${JSON.stringify(v.errors ?? [])}`),
    );
  }
}

function sha256HexBuf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Writes a v2 Decision Evidence Bundle:
 *   outcome-certificate.json (canonical sorted JSON, no trailing newline)
 *   material-truth.json      (canonical sorted JSON, no trailing newline)
 *   exit.json                (existing format: JSON.stringify + newline)
 *   human-layer.json         (existing format: JSON.stringify + newline)
 *   optional attestation.json, next-action.json
 *   manifest.json            (sorted JSON + newline, v2 with fingerprints)
 *   optional manifest.sig.json (Ed25519 sidecar over the manifest bytes)
 */
export function writeDecisionEvidenceBundle(options: WriteDecisionEvidenceBundleOptions): DecisionEvidenceCompleteness {
  const resolved = path.resolve(options.outDir);
  mkdirSync(resolved, { recursive: true });

  const validateCert = loadSchemaValidator("outcome-certificate-v3");
  if (!validateCert(options.certificate)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.INTERNAL_ERROR,
      formatOperationalMessage(`writeDecisionEvidenceBundle: certificate invalid ${JSON.stringify(validateCert.errors ?? [])}`),
    );
  }

  if (options.attestation !== undefined) {
    validateOptional("decision-evidence-attestation-v1", "decision attestation", options.attestation);
  }
  if (options.nextAction !== undefined) {
    validateOptional("decision-evidence-next-action-v1", "decision next-action", options.nextAction);
  }

  const certBytes = fingerprintUtf8JsonFileBytes(options.certificate);
  const certSha256 = sha256HexBuf(certBytes);

  const materialTruth = materialTruthProjectionFromCertificate(options.certificate);
  const validateMt = loadSchemaValidator("material-truth-v2");
  if (!validateMt(materialTruth)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.INTERNAL_ERROR,
      formatOperationalMessage(
        `writeDecisionEvidenceBundle: material-truth invalid ${JSON.stringify(validateMt.errors ?? [])}`,
      ),
    );
  }
  const mtBytes = fingerprintUtf8JsonFileBytes(materialTruth);
  const mtSha256 = sha256HexBuf(mtBytes);

  const exitPayload = {
    schemaVersion: 1 as const,
    exitCode: exitCodeFromOutcomeCertificate(options.certificate),
    cliConvention: "outcome_certificate_v2" as const,
  };
  validateOptional("decision-evidence-exit-v1", "exit", exitPayload);
  const exitUtf8 = `${JSON.stringify(exitPayload)}\n`;

  const humanLayer = buildHumanLayerFileJson(options.certificate, options.noHumanReport);
  validateOptional("decision-evidence-human-layer-v1", "human-layer", humanLayer);
  const humanUtf8 = `${JSON.stringify(humanLayer)}\n`;

  const producer = options.producer ?? readPackageIdentity();
  const a4Present = options.attestation !== undefined;
  const a5Present = options.nextAction !== undefined;

  atomicWriteUtf8File(path.join(resolved, DECISION_EVIDENCE_FILES.outcomeCertificate), certBytes.toString("utf8"));
  atomicWriteUtf8File(path.join(resolved, DECISION_EVIDENCE_FILES.materialTruth), mtBytes.toString("utf8"));
  atomicWriteUtf8File(path.join(resolved, DECISION_EVIDENCE_FILES.exit), exitUtf8);
  atomicWriteUtf8File(path.join(resolved, DECISION_EVIDENCE_FILES.humanLayer), humanUtf8);

  if (options.attestation !== undefined) {
    atomicWriteUtf8File(
      path.join(resolved, DECISION_EVIDENCE_FILES.attestation),
      `${JSON.stringify(options.attestation)}\n`,
    );
  }
  if (options.nextAction !== undefined) {
    atomicWriteUtf8File(
      path.join(resolved, DECISION_EVIDENCE_FILES.nextAction),
      `${JSON.stringify(options.nextAction)}\n`,
    );
  }

  const computed = computeCompletenessFromParts({
    certificateValid: true,
    coreFilesPresent: true,
    certificate: options.certificate,
    a4Present,
    a5Present,
  });

  const manifestPayload = {
    schemaVersion: 2 as const,
    bundleKind: "decision_evidence" as const,
    producer,
    createdAt: options.createdAt ?? new Date().toISOString(),
    workflowId: options.certificate.workflowId,
    ...(options.runId !== undefined ? { runId: options.runId } : {}),
    certificate: { relativePath: DECISION_EVIDENCE_FILES.outcomeCertificate, sha256: certSha256 },
    materialTruth: {
      relativePath: DECISION_EVIDENCE_FILES.materialTruth,
      schemaVersion: 2 as const,
      sha256: mtSha256,
    },
    completeness: {
      status: computed.status,
      artifacts: computed.artifacts,
    },
  };

  validateOptional("decision-evidence-bundle-manifest-v2", "manifest", manifestPayload);
  const manifestBytes = lineUtf8JsonFileBytes(manifestPayload);
  const manifestPath = path.join(resolved, DECISION_EVIDENCE_FILES.manifest);
  atomicWriteUtf8File(manifestPath, manifestBytes.toString("utf8"));

  if (options.signingPrivateKeyPemUtf8 !== undefined) {
    const sidecarBytes = signCanonicalBytesEd25519(
      readFileSync(manifestPath),
      options.signingPrivateKeyPemUtf8,
    );
    atomicWriteUtf8File(
      path.join(resolved, DECISION_EVIDENCE_FILES.manifestSignature),
      sidecarBytes.toString("utf8"),
    );
  }

  return computed;
}
