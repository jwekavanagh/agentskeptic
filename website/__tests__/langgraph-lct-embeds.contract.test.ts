import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const dir = join(root, "src", "content", "embeddedReports");
const files = {
  a2: "langgraph-lct-a2-ineligible.v1.json",
  b: "langgraph-lct-b-verified.v1.json",
  c: "langgraph-lct-c-mismatch.v1.json",
  d: "langgraph-lct-d-incomplete.v1.json",
};

function load(name: keyof typeof files) {
  return JSON.parse(readFileSync(join(dir, files[name]), "utf8")) as {
    runKind: string;
    stateRelation: string;
    steps: unknown[];
    checkpointVerdicts?: unknown;
  };
}

describe("langgraph LCT embeddedReports SSOT invariants", () => {
  it("all four use LangGraph runKind", () => {
    for (const k of Object.keys(files) as (keyof typeof files)[]) {
      const o = load(k);
      expect(o.runKind).toBe("contract_sql_langgraph_checkpoint_trust");
    }
  });

  it("A2: no steps, no checkpointVerdicts", () => {
    const o = load("a2");
    expect(o.steps).toEqual([]);
    expect(o.checkpointVerdicts).toBeUndefined();
  });

  it("B: matches_expectations, verified checkpoint", () => {
    const o = load("b");
    expect(o.stateRelation).toBe("matches_expectations");
    expect(Array.isArray(o.checkpointVerdicts)).toBe(true);
    expect(
      o.checkpointVerdicts?.length &&
        (o.checkpointVerdicts as { verdict: string }[]).every((x) => x.verdict === "verified"),
    ).toBe(true);
  });
});
