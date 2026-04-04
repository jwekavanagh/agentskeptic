import { describe, expect, it } from "vitest";
import {
  EVENT_SEQUENCE_MESSAGES,
  RUN_LEVEL_MESSAGES,
} from "./failureCatalog.js";
import {
  OPERATIONAL_CODE_TO_ORIGIN,
  OPERATIONAL_CODE_TO_SUMMARY,
  REASON_CODE_TO_ORIGIN,
  RUN_LEVEL_CODE_TO_ORIGIN,
  EVENT_SEQUENCE_CODE_TO_ORIGIN,
  STEP_NO_REASON_CODE,
  TEST_BLOCKING_CODE,
} from "./failureOriginCatalog.js";
import { CLI_OPERATIONAL_CODES, type OperationalCode } from "./cliOperationalCodes.js";
import { RESOLVE_FAILURE_CODES } from "./resolveFailureCodes.js";

const RECONCILER_STEP_CODES = new Set([
  "ROW_ABSENT",
  "DUPLICATE_ROWS",
  "ROW_SHAPE_MISMATCH",
  "UNREADABLE_VALUE",
  "VALUE_MISMATCH",
  "CONNECTOR_ERROR",
]);

const PIPELINE_STEP_CODES = new Set(["UNKNOWN_TOOL", "RETRY_OBSERVATIONS_DIVERGE"]);

const MULTI_EFFECT_CODES = new Set([
  "MULTI_EFFECT_PARTIAL",
  "MULTI_EFFECT_ALL_FAILED",
  "MULTI_EFFECT_INCOMPLETE",
]);

const POLICY_CODES = new Set(["ROW_NOT_OBSERVED_WITHIN_WINDOW", "MULTI_EFFECT_UNCERTAIN_WITHIN_WINDOW"]);

describe("failureOriginCatalog exhaustiveness", () => {
  it("every RESOLVE_FAILURE_CODES key exists in REASON_CODE_TO_ORIGIN", () => {
    for (const c of RESOLVE_FAILURE_CODES) {
      expect(REASON_CODE_TO_ORIGIN[c], c).toBeDefined();
    }
  });

  it("every production step code family is mapped", () => {
    for (const c of RECONCILER_STEP_CODES) {
      expect(REASON_CODE_TO_ORIGIN[c], c).toBeDefined();
    }
    for (const c of PIPELINE_STEP_CODES) {
      expect(REASON_CODE_TO_ORIGIN[c], c).toBeDefined();
    }
    for (const c of MULTI_EFFECT_CODES) {
      expect(REASON_CODE_TO_ORIGIN[c], c).toBeDefined();
    }
    for (const c of POLICY_CODES) {
      expect(REASON_CODE_TO_ORIGIN[c], c).toBeDefined();
    }
    expect(REASON_CODE_TO_ORIGIN[STEP_NO_REASON_CODE]).toBeDefined();
    expect(REASON_CODE_TO_ORIGIN[TEST_BLOCKING_CODE]).toBeDefined();
  });

  it("every run-level message key maps", () => {
    for (const k of Object.keys(RUN_LEVEL_MESSAGES) as (keyof typeof RUN_LEVEL_MESSAGES)[]) {
      expect(RUN_LEVEL_CODE_TO_ORIGIN[k], k).toBeDefined();
    }
  });

  it("every event-sequence message key maps", () => {
    for (const k of Object.keys(EVENT_SEQUENCE_MESSAGES) as (keyof typeof EVENT_SEQUENCE_MESSAGES)[]) {
      expect(EVENT_SEQUENCE_CODE_TO_ORIGIN[k], k).toBeDefined();
    }
    expect(EVENT_SEQUENCE_CODE_TO_ORIGIN["TIMESTAMP_NOT_MONOTONIC_WITH_SEQ_SORT_ORDER"]).toBeDefined();
  });

  it("every CLI_OPERATIONAL_CODES maps to origin and summary", () => {
    for (const k of Object.keys(CLI_OPERATIONAL_CODES) as OperationalCode[]) {
      expect(OPERATIONAL_CODE_TO_ORIGIN[k], k).toBeDefined();
      expect(OPERATIONAL_CODE_TO_SUMMARY[k].length, k).toBeGreaterThan(0);
    }
  });
});
