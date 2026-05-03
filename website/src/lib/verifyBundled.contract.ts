import { z } from "zod";

const rerunPathSchema = z.object({
  type: z.enum([
    "same_input_verify",
    "after_input_fix_verify",
    "after_state_fix_verify",
    "after_manual_review_verify",
    "no_rerun_needed",
  ]),
  sameInputs: z.boolean(),
  prerequisite: z.string(),
  meaningfulWhen: z.string(),
  readinessLabel: z.string(),
});

const actionableFailureSchema = z.object({
  category: z.string(),
  severity: z.string(),
  recommendedAction: z.string(),
  automationSafe: z.boolean(),
});

const remediationItemSchema = z.object({
  id: z.string(),
  scope: z.enum(["run_level", "event_sequence", "run_context", "step", "effect", "quick_unit", "quick_ingest"]),
  primary: z.boolean(),
  failedCheck: z.string(),
  reasonCodes: z.array(z.string()),
  reason: z.string(),
  recommendedAction: z.string(),
  actionText: z.string(),
  expectedState: z.object({
    summary: z.string(),
    projectionKind: z.string().optional(),
  }),
  automation: z.object({
    class: z.enum(["read_only_retry", "input_regeneration_candidate", "human_write_required", "never_auto_mutate"]),
    label: z.string(),
    boundary: z.string(),
  }),
  humanReview: z.object({
    required: z.boolean(),
    decisionPrompt: z.string().optional(),
    hypotheses: z.array(z.string()).optional(),
    knownFacts: z.array(z.string()).optional(),
    evidenceToInspect: z.array(z.string()).optional(),
  }),
  rerunPath: rerunPathSchema,
});

const failureSpineSchema = z
  .object({
    schemaVersion: z.number(),
    actionableFailure: actionableFailureSchema,
  })
  .passthrough();

const evidenceCompletenessSchema = z
  .object({
    schemaVersion: z.number(),
    blockerCategory: z.string(),
    nextActions: z.array(z.object({ id: z.string(), text: z.string() })),
    rerunReadiness: z.string().optional(),
    rerunPath: rerunPathSchema.optional(),
    remediationItems: z.array(remediationItemSchema).optional(),
  })
  .passthrough();

/** Bundled `/api/verify` outcome certificate (structured fields required for remediation UI). */
export const bundledOutcomeCertificateSchema = z
  .object({
    schemaVersion: z.literal(3),
    stateRelation: z.enum(["matches_expectations", "does_not_match", "not_established"]),
    failureSpine: failureSpineSchema,
    evidenceCompleteness: evidenceCompletenessSchema,
    correctnessDefinition: z.unknown().optional(),
  })
  .passthrough();

export type BundledOutcomeCertificate = z.infer<typeof bundledOutcomeCertificateSchema>;

export const verifyBundledSuccessResponseClientSchema = z.object({
  ok: z.literal(true),
  workflowId: z.string().min(1),
  certificate: bundledOutcomeCertificateSchema,
  humanReport: z.string().min(1),
});

/** Shared success contract for both `/api/verify` and `/api/demo/verify`. */
export const verifyBundledSuccessResponseSchema = verifyBundledSuccessResponseClientSchema;

export type VerifyBundledSuccessResponse = z.infer<typeof verifyBundledSuccessResponseSchema>;

export const verifyBundledErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export type VerifyBundledErrorResponse = z.infer<typeof verifyBundledErrorResponseSchema>;

export const VERIFY_BUNDLED_ERROR_CODES = {
  METHOD_NOT_ALLOWED: "VERIFY_METHOD_NOT_ALLOWED",
  UNSUPPORTED_MEDIA_TYPE: "VERIFY_UNSUPPORTED_MEDIA_TYPE",
  INVALID_JSON: "VERIFY_INVALID_JSON",
  VALIDATION_FAILED: "VERIFY_VALIDATION_FAILED",
  FIXTURES_MISSING: "VERIFY_FIXTURES_MISSING",
  UNAVAILABLE: "VERIFY_UNAVAILABLE",
  ENGINE_FAILED: "VERIFY_ENGINE_FAILED",
  RESULT_SCHEMA_MISMATCH: "VERIFY_RESULT_SCHEMA_MISMATCH",
} as const;
