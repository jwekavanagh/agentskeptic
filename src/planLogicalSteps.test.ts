import { describe, expect, it } from "vitest";
import { canonicalJsonForParams } from "./canonicalParams.js";
import { planLogicalSteps, stableSortEventsBySeq } from "./planLogicalSteps.js";
import type { ToolObservedEvent } from "./types.js";

function ev(over: Partial<ToolObservedEvent> & Pick<ToolObservedEvent, "seq" | "toolId">): ToolObservedEvent {
  return {
    schemaVersion: 1,
    workflowId: "w",
    type: "tool_observed",
    params: {},
    ...over,
  } as ToolObservedEvent;
}

describe("canonicalJsonForParams", () => {
  it("matches JSON scalars", () => {
    expect(canonicalJsonForParams(null)).toBe("null");
    expect(canonicalJsonForParams(true)).toBe("true");
    expect(canonicalJsonForParams(1)).toBe("1");
    expect(canonicalJsonForParams("a")).toBe('"a"');
  });

  it("sorts object keys by UTF-16 code unit order", () => {
    expect(canonicalJsonForParams({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("nested objects and arrays", () => {
    expect(canonicalJsonForParams({ x: [{ z: 1, y: 2 }] })).toBe('{"x":[{"y":2,"z":1}]}');
  });

  it("non-JSON kinds use sentinel", () => {
    expect(canonicalJsonForParams(undefined)).toBe("__non_json_params:undefined__");
  });
});

describe("stableSortEventsBySeq", () => {
  it("stable for equal seq", () => {
    const a = ev({ seq: 1, toolId: "t", params: { i: 0 } });
    const b = ev({ seq: 0, toolId: "t", params: { i: 1 } });
    const c = ev({ seq: 0, toolId: "t", params: { i: 2 } });
    const sorted = stableSortEventsBySeq([a, b, c]);
    expect(sorted.map((e) => e.params.i)).toEqual([1, 2, 0]);
  });
});

describe("planLogicalSteps", () => {
  it("single observation", () => {
    const e = ev({ seq: 0, toolId: "t", params: { a: 1 } });
    const plans = planLogicalSteps([e]);
    expect(plans).toHaveLength(1);
    expect(plans[0]!.repeatObservationCount).toBe(1);
    expect(plans[0]!.divergent).toBe(false);
    expect(plans[0]!.last).toBe(e);
  });

  it("two identical retries — not divergent", () => {
    const a = ev({ seq: 0, toolId: "t", params: { x: 1 } });
    const b = ev({ seq: 0, toolId: "t", params: { x: 1 } });
    const plans = planLogicalSteps([a, b]);
    expect(plans[0]!.repeatObservationCount).toBe(2);
    expect(plans[0]!.divergent).toBe(false);
    expect(plans[0]!.last).toBe(b);
  });

  it("two different params — divergent", () => {
    const a = ev({ seq: 0, toolId: "t", params: { x: 1 } });
    const b = ev({ seq: 0, toolId: "t", params: { x: 2 } });
    const plans = planLogicalSteps([a, b]);
    expect(plans[0]!.divergent).toBe(true);
    expect(plans[0]!.last).toBe(b);
  });

  it("toolId mismatch vs last — divergent", () => {
    const a = ev({ seq: 0, toolId: "t1", params: {} });
    const b = ev({ seq: 0, toolId: "t2", params: {} });
    const plans = planLogicalSteps([a, b]);
    expect(plans[0]!.divergent).toBe(true);
  });

  it("multiple seq groups ascending", () => {
    const p0 = ev({ seq: 0, toolId: "t", params: {} });
    const p1 = ev({ seq: 1, toolId: "t", params: {} });
    const plans = planLogicalSteps([p1, p0]);
    expect(plans.map((p) => p.seq)).toEqual([0, 1]);
  });

  it("three same seq: first two match last — not divergent", () => {
    const a = ev({ seq: 0, toolId: "t", params: { n: 1 } });
    const b = ev({ seq: 0, toolId: "t", params: { n: 1 } });
    const c = ev({ seq: 0, toolId: "t", params: { n: 1 } });
    expect(planLogicalSteps([a, b, c])[0]!.divergent).toBe(false);
  });

  it("three same seq: middle differs from last — divergent", () => {
    const a = ev({ seq: 0, toolId: "t", params: { n: 1 } });
    const b = ev({ seq: 0, toolId: "t", params: { n: 2 } });
    const c = ev({ seq: 0, toolId: "t", params: { n: 1 } });
    expect(planLogicalSteps([a, b, c])[0]!.divergent).toBe(true);
  });
});
