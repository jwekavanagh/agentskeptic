import { describe, expect, it } from "vitest";
import { PRODUCTION_STEP_REASON_CODES } from "./failureOriginCatalog.js";
import { productionStepReasonCodeToActionableCategory } from "./actionableFailure.js";

const CONCRETE = new Set([
  "decision_error",
  "bad_input",
  "retrieval_failure",
  "control_flow_problem",
  "state_inconsistency",
  "downstream_execution_failure",
]);

describe("productionStepReasonCodeToActionableCategory (partition D/E)", () => {
  it("classifies every PRODUCTION_STEP_REASON_CODES value into a concrete six-class bucket", () => {
    for (const code of PRODUCTION_STEP_REASON_CODES) {
      const cat = productionStepReasonCodeToActionableCategory(code);
      expect(CONCRETE.has(cat), `${code} -> ${cat}`).toBe(true);
    }
  });
});
