import { createHash } from "node:crypto";
import type { OutcomeCertificateV1 } from "./outcomeCertificate.js";
import { stringifyWithSortedKeys } from "./sortedJsonStringify.js";

/** SHA-256 (64 lowercase hex) of UTF-8 canonical JSON (sorted keys) of the certificate. */
export function certificateCanonicalDigestHex(certificate: OutcomeCertificateV1): string {
  return createHash("sha256").update(stringifyWithSortedKeys(certificate), "utf8").digest("hex");
}
