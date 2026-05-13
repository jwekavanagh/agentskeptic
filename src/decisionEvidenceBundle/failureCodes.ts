/**
 * Normative `errors[].code` and `errors[].message` constants for decision-bundle validation.
 * Messages are contract-fixed; contract tests string-compare both code and message.
 */

export const MANIFEST_SCHEMA = "MANIFEST_SCHEMA";
export const DECISION_BUNDLE_CERT_FINGERPRINT_MISMATCH = "DECISION_BUNDLE_CERT_FINGERPRINT_MISMATCH";
export const DECISION_BUNDLE_MATERIAL_TRUTH_FINGERPRINT_MISMATCH =
  "DECISION_BUNDLE_MATERIAL_TRUTH_FINGERPRINT_MISMATCH";
export const DECISION_BUNDLE_MATERIAL_TRUTH_MISSING = "DECISION_BUNDLE_MATERIAL_TRUTH_MISSING";
export const DECISION_BUNDLE_MATERIAL_TRUTH_SCHEMA = "DECISION_BUNDLE_MATERIAL_TRUTH_SCHEMA";
export const DECISION_BUNDLE_SIGNATURE_KEY_REQUIRED = "DECISION_BUNDLE_SIGNATURE_KEY_REQUIRED";
export const DECISION_BUNDLE_SIGNATURE_INVALID = "DECISION_BUNDLE_SIGNATURE_INVALID";

export const DECISION_BUNDLE_FAILURE_MESSAGES = {
  [MANIFEST_SCHEMA]: "manifest.json failed schema validation or is not a supported manifest version.",
  [DECISION_BUNDLE_CERT_FINGERPRINT_MISMATCH]:
    "outcome-certificate.json sha256 does not match manifest.certificate.sha256",
  [DECISION_BUNDLE_MATERIAL_TRUTH_FINGERPRINT_MISMATCH]:
    "material-truth.json sha256 does not match manifest.materialTruth.sha256",
  [DECISION_BUNDLE_MATERIAL_TRUTH_MISSING]:
    "material-truth.json is required for manifest schemaVersion 2 and was not found.",
  [DECISION_BUNDLE_MATERIAL_TRUTH_SCHEMA]:
    "material-truth.json failed material-truth-v2 schema validation.",
  [DECISION_BUNDLE_SIGNATURE_KEY_REQUIRED]:
    "manifest.sig.json is present; pass --public-key <path> with the signer's SPKI PEM.",
  [DECISION_BUNDLE_SIGNATURE_INVALID]:
    "manifest.sig.json failed Ed25519 verification or does not match manifest.json bytes.",
} as const;

export type DecisionBundleFailureCode = keyof typeof DECISION_BUNDLE_FAILURE_MESSAGES;

export function decisionBundleFailure(code: DecisionBundleFailureCode): { code: string; message: string } {
  return { code, message: DECISION_BUNDLE_FAILURE_MESSAGES[code] };
}
