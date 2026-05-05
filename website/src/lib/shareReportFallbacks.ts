/**
 * User-visible strings for shared report executive summary (website only).
 * `productCopy.ts` is unchanged per plan; new copy lives here.
 */
export const SHARED_REPORT_REASON_FALLBACK =
  "No structured primary reason is available; see the canonical human report." as const;

export const SHARED_REPORT_HEADLINE_FALLBACK =
  "Verification outcome (structured headline unavailable)." as const;

export const SHARED_REPORT_NEXT_FALLBACK_NON_TRUSTED =
  "Follow the remediation and rerun guidance in the machine JSON and canonical human report." as const;

export const SHARED_REPORT_NEXT_TRUSTED =
  "No further verifier action is required for this outcome; archive the Outcome Certificate JSON per your policy." as const;

export const SHARED_REPORT_LEGACY_ENVELOPE_NOTICE =
  "Structured decision summary is available for Outcome Certificate v3 shares only." as const;

export const SHARED_REPORT_MALFORMED_CERTIFICATE_NOTICE =
  "Certificate summary unavailable; use the canonical human report and machine JSON below." as const;

export const SHARED_REPORT_AUTHORITY_NOTE =
  "This page summarizes fields from the stored Outcome Certificate. The Outcome Certificate JSON below is the machine source of truth for integrations. The canonical human report is the full audit-oriented artifact; this summary is not a substitute for either." as const;

export const SHARED_REPORT_VERDICT_TRUSTED = "Trusted" as const;
export const SHARED_REPORT_VERDICT_NOT_TRUSTED = "Not trusted" as const;
export const SHARED_REPORT_VERDICT_UNKNOWN = "Unknown" as const;
