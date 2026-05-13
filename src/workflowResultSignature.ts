import { signCanonicalBytesEd25519 } from "./signCanonicalBytesEd25519.js";
import { normalizeSpkiPemForSidecar } from "./workflowResultSignaturePemNormalize.js";

export { normalizeSpkiPemForSidecar };

/**
 * PKCS#8 PEM Ed25519 private key → sign workflow-result bytes → deterministic sidecar UTF-8 buffer.
 *
 * Delegates to {@link signCanonicalBytesEd25519} (shared with decision-bundle manifest signing).
 * Sidecar JSON key order: algorithm, schemaVersion, signatureBase64, signedContentSha256Hex,
 * signingPublicKeySpkiPem; trailing `\n`.
 */
export function buildWorkflowResultSigSidecarBytes(
  workflowResultBytes: Buffer,
  privateKeyPemUtf8: string,
): Buffer {
  return signCanonicalBytesEd25519(workflowResultBytes, privateKeyPemUtf8);
}
