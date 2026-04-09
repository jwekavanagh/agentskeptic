export const DEMO_SCENARIO_IDS = ["wf_complete", "wf_missing", "wf_inconsistent"] as const;
export type DemoScenarioId = (typeof DEMO_SCENARIO_IDS)[number];
