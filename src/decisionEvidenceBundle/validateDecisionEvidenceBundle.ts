import { createHash, createPublicKey, verify } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { stringifyWithSortedKeys } from "../sortedJsonStringify.js";
import { loadSchemaValidator } from "../schemaLoad.js";
import { lfCanonicalUtf8Payload, sha256Hex } from "../agentRunRecord.js";
import { normalizeSpkiPemForSidecar } from "../workflowResultSignaturePemNormalize.js";
import { DECISION_EVIDENCE_FILES } from "./constants.js";
import {
  DECISION_BUNDLE_CERT_FINGERPRINT_MISMATCH,
  DECISION_BUNDLE_MATERIAL_TRUTH_FINGERPRINT_MISMATCH,
  DECISION_BUNDLE_MATERIAL_TRUTH_MISSING,
  DECISION_BUNDLE_MATERIAL_TRUTH_SCHEMA,
  DECISION_BUNDLE_SIGNATURE_INVALID,
  DECISION_BUNDLE_SIGNATURE_KEY_REQUIRED,
  decisionBundleFailure,
  MANIFEST_SCHEMA,
  type DecisionBundleFailureCode,
} from "./failureCodes.js";

type ArtifactsFlags = {
  a4Present: boolean;
  a5Present: boolean;
  a5Required: boolean;
};

type Completeness = {
  status: "complete" | "partial" | "invalid";
  artifacts: ArtifactsFlags;
};

type IntegritySignature = "absent" | "valid" | "invalid";

type Integrity = {
  manifestVersion: 1 | 2;
  certificateFingerprintOk: boolean | null;
  materialTruthFingerprintOk: boolean | null;
  materialTruthPresent: boolean;
  selfVerifying: boolean;
  signature: IntegritySignature;
  signaturePublicKeySpkiPem: string | null;
};

export type DecisionBundleValidationLine = {
  schemaVersion: 1;
  kind: "decision_bundle_validation";
  status: "valid" | "invalid";
  bundleDir: string;
  completeness: Completeness;
  errors: Array<{ code: string; message: string }>;
  integrity: Integrity;
};

export type ValidateDecisionEvidenceBundleOptions = {
  /** When set, used to verify `manifest.sig.json` if present. */
  publicKeyPemUtf8?: string;
};

function sha256HexBuf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function parseJson(buf: Buffer): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(buf.toString("utf8")) as unknown };
  } catch {
    return { ok: false };
  }
}

function existsArtifact(absPath: string): boolean {
  try {
    return existsSync(absPath);
  } catch {
    return false;
  }
}

function readFileOptional(absPath: string): Buffer | null {
  try {
    return readFileSync(absPath);
  } catch {
    return null;
  }
}

function detectManifestVersion(parsed: unknown): 1 | 2 {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const sv = obj.schemaVersion;
    if (sv === 1) return 1;
  }
  return 2;
}

function manifestSchemaFailureEnvelope(args: {
  resolved: string;
  manifestVersion: 1 | 2;
  materialTruthPresent: boolean;
  artifacts: ArtifactsFlags;
}): DecisionBundleValidationLine {
  return {
    schemaVersion: 1,
    kind: "decision_bundle_validation",
    status: "invalid",
    bundleDir: args.resolved,
    completeness: {
      status: "invalid",
      artifacts: args.artifacts,
    },
    errors: [decisionBundleFailure(MANIFEST_SCHEMA)],
    integrity: {
      manifestVersion: args.manifestVersion,
      certificateFingerprintOk: null,
      materialTruthFingerprintOk: null,
      materialTruthPresent: args.materialTruthPresent,
      selfVerifying: false,
      signature: "absent",
      signaturePublicKeySpkiPem: null,
    },
  };
}

function tryVerifySignature(args: {
  manifestBytes: Buffer;
  sidecarBytes: Buffer;
  publicKeyPemUtf8: string;
}): boolean {
  try {
    const sidecar = JSON.parse(args.sidecarBytes.toString("utf8")) as Record<string, unknown>;
    const validateSidecar = loadSchemaValidator("workflow-result-signature");
    if (!validateSidecar(sidecar)) return false;
    const sigB64 = String(sidecar.signatureBase64);
    const lfManifest = lfCanonicalUtf8Payload(args.manifestBytes);
    const expectedHash = sha256Hex(lfManifest);
    if (sidecar.signedContentSha256Hex !== expectedHash) return false;
    const pubKey = createPublicKey({
      key: normalizeSpkiPemForSidecar(args.publicKeyPemUtf8),
      format: "pem",
    });
    return verify(null, lfManifest, pubKey, Buffer.from(sigB64, "base64"));
  } catch {
    return false;
  }
}

/**
 * Validates a directory produced by writeDecisionEvidenceBundle.
 *
 * Tier 1 (throws): `realpathSync` / `readdirSync` on `bundleDir` fail. Caller maps to exit 3.
 * Tier 2 (returns): Always returns a `DecisionBundleValidationLine` with `integrity` populated.
 */
export function validateDecisionEvidenceBundle(
  bundleDir: string,
  options: ValidateDecisionEvidenceBundleOptions = {},
): DecisionBundleValidationLine {
  const resolved = realpathSync(path.resolve(bundleDir));
  // Tier-1 probe: directory must be open for read.
  readdirSync(resolved);

  const manifestPath = path.join(resolved, DECISION_EVIDENCE_FILES.manifest);
  const sigPath = path.join(resolved, DECISION_EVIDENCE_FILES.manifestSignature);
  const ocPath = path.join(resolved, DECISION_EVIDENCE_FILES.outcomeCertificate);
  const mtPath = path.join(resolved, DECISION_EVIDENCE_FILES.materialTruth);
  const a4Path = path.join(resolved, DECISION_EVIDENCE_FILES.attestation);
  const a5Path = path.join(resolved, DECISION_EVIDENCE_FILES.nextAction);

  const a4Present = existsArtifact(a4Path);
  const a5Present = existsArtifact(a5Path);
  const materialTruthPresent = existsArtifact(mtPath);

  const baseArtifacts: ArtifactsFlags = { a4Present, a5Present, a5Required: false };

  // --- Tier 2: load manifest bytes (any IO failure collapses to MANIFEST_SCHEMA + exit 2)
  const manifestBytes = readFileOptional(manifestPath);
  if (manifestBytes === null) {
    return manifestSchemaFailureEnvelope({
      resolved,
      manifestVersion: 2,
      materialTruthPresent,
      artifacts: baseArtifacts,
    });
  }

  const parsedManifest = parseJson(manifestBytes);
  if (!parsedManifest.ok) {
    return manifestSchemaFailureEnvelope({
      resolved,
      manifestVersion: 2,
      materialTruthPresent,
      artifacts: baseArtifacts,
    });
  }

  const manifestVersion = detectManifestVersion(parsedManifest.value);

  const v1Validator = loadSchemaValidator("decision-evidence-bundle-manifest-v1");
  const v2Validator = loadSchemaValidator("decision-evidence-bundle-manifest-v2");
  const v1Ok = v1Validator(parsedManifest.value);
  const v2Ok = v2Validator(parsedManifest.value);

  if (!v1Ok && !v2Ok) {
    return manifestSchemaFailureEnvelope({
      resolved,
      manifestVersion,
      materialTruthPresent,
      artifacts: baseArtifacts,
    });
  }

  const manifest = parsedManifest.value as Record<string, unknown>;
  const manifestCompleteness = manifest.completeness as
    | { status?: unknown; artifacts?: Record<string, unknown> }
    | undefined;
  const manifestStatus =
    typeof manifestCompleteness?.status === "string" &&
    (manifestCompleteness.status === "complete" ||
      manifestCompleteness.status === "partial" ||
      manifestCompleteness.status === "invalid")
      ? (manifestCompleteness.status as "complete" | "partial" | "invalid")
      : "invalid";
  const manifestArtifacts = (manifestCompleteness?.artifacts ?? {}) as Record<string, unknown>;
  const completenessArtifacts: ArtifactsFlags = {
    a4Present:
      typeof manifestArtifacts.a4Present === "boolean" ? manifestArtifacts.a4Present : a4Present,
    a5Present:
      typeof manifestArtifacts.a5Present === "boolean" ? manifestArtifacts.a5Present : a5Present,
    a5Required:
      typeof manifestArtifacts.a5Required === "boolean" ? manifestArtifacts.a5Required : false,
  };

  const certBytes = readFileOptional(ocPath);
  const errors: Array<{ code: DecisionBundleFailureCode | string; message: string }> = [];
  let certificateFingerprintOk: boolean | null;
  let materialTruthFingerprintOk: boolean | null;
  let signature: IntegritySignature = "absent";
  let signaturePublicKeySpkiPem: string | null = null;

  if (manifestVersion === 1) {
    certificateFingerprintOk = null;
    materialTruthFingerprintOk = null;
    signature = "absent";
  } else {
    // v2 path
    const certEntry = manifest.certificate as { sha256?: unknown } | undefined;
    const declaredCertSha = typeof certEntry?.sha256 === "string" ? certEntry.sha256 : "";
    if (certBytes !== null && declaredCertSha) {
      certificateFingerprintOk = sha256HexBuf(certBytes) === declaredCertSha;
      if (!certificateFingerprintOk) {
        errors.push(decisionBundleFailure(DECISION_BUNDLE_CERT_FINGERPRINT_MISMATCH));
      }
    } else {
      certificateFingerprintOk = false;
      errors.push(decisionBundleFailure(DECISION_BUNDLE_CERT_FINGERPRINT_MISMATCH));
    }

    const mtEntry = manifest.materialTruth as { sha256?: unknown } | undefined;
    const declaredMtSha = typeof mtEntry?.sha256 === "string" ? mtEntry.sha256 : "";
    if (!materialTruthPresent) {
      materialTruthFingerprintOk = null;
      errors.push(decisionBundleFailure(DECISION_BUNDLE_MATERIAL_TRUTH_MISSING));
    } else {
      const mtBytes = readFileOptional(mtPath);
      if (mtBytes === null) {
        materialTruthFingerprintOk = null;
        errors.push(decisionBundleFailure(DECISION_BUNDLE_MATERIAL_TRUTH_MISSING));
      } else {
        // Fingerprint check first; mt-v2 schema check only when the bytes hash to the declared digest.
        materialTruthFingerprintOk = sha256HexBuf(mtBytes) === declaredMtSha;
        if (!materialTruthFingerprintOk) {
          errors.push(decisionBundleFailure(DECISION_BUNDLE_MATERIAL_TRUTH_FINGERPRINT_MISMATCH));
        } else {
          const parsedMt = parseJson(mtBytes);
          const mtSchemaOk =
            parsedMt.ok && loadSchemaValidator("material-truth-v2")(parsedMt.value);
          if (!mtSchemaOk) {
            errors.push(decisionBundleFailure(DECISION_BUNDLE_MATERIAL_TRUTH_SCHEMA));
          }
        }
      }
    }

    // Signature handling (v2 only)
    const sidecarBytes = readFileOptional(sigPath);
    if (sidecarBytes !== null) {
      if (options.publicKeyPemUtf8 === undefined) {
        signature = "invalid";
        errors.push(decisionBundleFailure(DECISION_BUNDLE_SIGNATURE_KEY_REQUIRED));
      } else {
        const ok = tryVerifySignature({
          manifestBytes,
          sidecarBytes,
          publicKeyPemUtf8: options.publicKeyPemUtf8,
        });
        if (ok) {
          signature = "valid";
          signaturePublicKeySpkiPem = normalizeSpkiPemForSidecar(options.publicKeyPemUtf8);
        } else {
          signature = "invalid";
          errors.push(decisionBundleFailure(DECISION_BUNDLE_SIGNATURE_INVALID));
        }
      }
    }
  }

  const hasIntegrityError = errors.length > 0;
  const completenessStatus = manifestStatus;
  const status: "valid" | "invalid" =
    hasIntegrityError || completenessStatus === "invalid" ? "invalid" : "valid";
  const selfVerifying =
    manifestVersion === 2 &&
    status === "valid" &&
    !hasIntegrityError &&
    (signature === "absent" || signature === "valid");

  return {
    schemaVersion: 1,
    kind: "decision_bundle_validation",
    status,
    bundleDir: resolved,
    completeness: {
      status: completenessStatus,
      artifacts: completenessArtifacts,
    },
    errors,
    integrity: {
      manifestVersion,
      certificateFingerprintOk,
      materialTruthFingerprintOk,
      materialTruthPresent,
      selfVerifying,
      signature,
      signaturePublicKeySpkiPem,
    },
  };
}

export function formatValidationStdout(line: DecisionBundleValidationLine): string {
  return stringifyWithSortedKeys(line);
}
