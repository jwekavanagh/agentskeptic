import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";

/** Mirrors `emitOutcomeCertificateCliAndExitByStateRelation` exit mapping. */
export function exitCodeFromOutcomeCertificate(certificate: OutcomeCertificateV1): number {
  if (certificate.stateRelation === "matches_expectations") return 0;
  if (certificate.stateRelation === "does_not_match") return 1;
  return 2;
}
