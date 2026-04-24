/**
 * Single source of truth for the “first five minutes” onboarding checklist
 * (product success decoupled from telemetry). Imported by CLI, website, and
 * enforced in CI via doc fingerprints — do not duplicate these strings in markdown.
 */
export const FIRST_FIVE_MINUTES_CHECKLIST: readonly string[] = [
  "Visit an allowlisted marketing page or /integrate so the site can mint or reuse funnel_anon_id (skipped on routes without the beacon).",
  "Join CLI to that id: run agentskeptic funnel-anon pull once, or agentskeptic funnel-anon set <uuid> if you already copied one from the browser.",
  "Run verification on your workflow; green exit and verdict are product success.",
  "Set AGENTSKEPTIC_TELEMETRY=0 to disable opt-in activity posts; they never change verification results.",
] as const;

/** One line framing telemetry vs product outcome (shown in UI + envelope context). */
export const TELEMETRY_ICING_LINE =
  "Optional telemetry helps connect browser demos and CLI verification. It never affects verification results and can be disabled." as const;

/** Full lines that must not appear verbatim under docs/ (any .md file; guards hand-copied checklist drift). */
export function getChecklistDocFingerprints(): ReadonlyArray<string> {
  return [...FIRST_FIVE_MINUTES_CHECKLIST, TELEMETRY_ICING_LINE];
}
