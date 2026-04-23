export const DEMO_SCENARIO_IDS = ["wf_complete", "wf_missing", "wf_inconsistent"] as const;
export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];

/** Human labels for the homepage Try-it control; wire values stay `DEMO_SCENARIO_IDS`. */
export const DEMO_SCENARIO_PRESENTATION: Record<
  DemoScenarioId,
  { label: string; oneLiner: string }
> = {
  wf_complete: {
    label: "Happy path — everything matches",
    oneLiner: "Structured tool activity matches the persisted row; workflow completes as verified.",
  },
  wf_missing: {
    label: "Missing write (recommended first try)",
    oneLiner:
      "The agent reported a side effect, but the expected row is still absent under registry rules (ROW_ABSENT).",
  },
  wf_inconsistent: {
    label: "Stale data — row exists, values wrong",
    oneLiner: "A row exists but observed data does not match expectations under your registry rules.",
  },
};
