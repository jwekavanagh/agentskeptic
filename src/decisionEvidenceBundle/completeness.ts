import type { OutcomeCertificateV1 } from "../outcomeCertificate.js";

export type DecisionEvidenceCompletenessStatus = "complete" | "partial" | "invalid";

export type DecisionEvidenceArtifactsFlags = {
  a4Present: boolean;
  a5Present: boolean;
  a5Required: boolean;
};

export type DecisionEvidenceCompleteness = {
  status: DecisionEvidenceCompletenessStatus;
  artifacts: DecisionEvidenceArtifactsFlags;
};

export function a5RequiredFromCertificate(certificate: OutcomeCertificateV1): boolean {
  return (
    certificate.stateRelation === "does_not_match" || certificate.stateRelation === "not_established"
  );
}

export function computeCompletenessFromParts(input: {
  certificateValid: boolean;
  coreFilesPresent: boolean;
  /** outcome-certificate.json parsed object when valid */
  certificate: OutcomeCertificateV1 | null;
  a4Present: boolean;
  a5Present: boolean;
}): DecisionEvidenceCompleteness & { errors: Array<{ code: string; message: string }> } {
  const errors: Array<{ code: string; message: string }> = [];

  if (!input.coreFilesPresent || !input.certificateValid || input.certificate === null) {
    if (!input.coreFilesPresent) {
      errors.push({ code: "MISSING_CORE_FILES", message: "Missing required bundle files." });
    }
    if (!input.certificateValid) {
      errors.push({ code: "CERTIFICATE_INVALID", message: "outcome-certificate.json invalid or not schema-valid." });
    }
    return {
      status: "invalid",
      artifacts: {
        a4Present: input.a4Present,
        a5Present: input.a5Present,
        a5Required: input.certificate !== null ? a5RequiredFromCertificate(input.certificate) : false,
      },
      errors,
    };
  }

  const cert = input.certificate;
  const a5Req = a5RequiredFromCertificate(cert);
  const artifacts: DecisionEvidenceArtifactsFlags = {
    a4Present: input.a4Present,
    a5Present: input.a5Present,
    a5Required: a5Req,
  };

  if (a5Req && !input.a5Present) {
    errors.push({ code: "A5_REQUIRED_MISSING", message: "next-action.json required for this stateRelation." });
    return { status: "partial", artifacts, errors };
  }

  return { status: "complete", artifacts, errors: [] };
}
