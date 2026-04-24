import { describe, expect, it } from "vitest";
import {
  DEBUG_CONSOLE_DEFAULT_TAB,
  defaultFilterRecord,
  parseDebugConsoleUrl,
  resolvedFilters,
  serializeDebugConsoleUrl,
} from "../debug-ui/urlState.js";

describe("debug-ui urlState", () => {
  it("round-trips tab, run, and text filters", () => {
    const state = {
      tab: "compare",
      run: "run_value_mismatch",
      filters: {
        ...defaultFilterRecord(),
        workflowId: "wf_complete",
        status: "inconsistent",
        hasPathFindings: "true",
        includeLoadErrors: "true",
      },
    };
    const q = serializeDebugConsoleUrl(state);
    const parsed = parseDebugConsoleUrl(new URLSearchParams(q));
    expect(parsed.tab).toBe("compare");
    expect(parsed.run).toBe("run_value_mismatch");
    expect(parsed.filters.workflowId).toBe("wf_complete");
    expect(parsed.filters.status).toBe("inconsistent");
    expect(parsed.filters.hasPathFindings).toBe("true");
    expect(parsed.filters.includeLoadErrors).toBeUndefined();
    const again = serializeDebugConsoleUrl({
      tab: parsed.tab,
      run: parsed.run,
      filters: resolvedFilters(parsed.filters),
    });
    expect(parseDebugConsoleUrl(new URLSearchParams(again))).toEqual(parsed);
  });

  it("defaults invalid tab to runs", () => {
    expect(parseDebugConsoleUrl(new URLSearchParams("tab=nope")).tab).toBe(DEBUG_CONSOLE_DEFAULT_TAB);
  });

  it("serializes includeLoadErrors=false when non-default", () => {
    const q = serializeDebugConsoleUrl({
      tab: "runs",
      run: null,
      filters: { includeLoadErrors: "false", hasPathFindings: "false" },
    });
    expect(q).toContain("includeLoadErrors=false");
    expect(q).not.toContain("hasPathFindings");
  });

  it("ignores unknown keys in parse", () => {
    const p = parseDebugConsoleUrl(new URLSearchParams("foo=bar&tab=patterns"));
    expect(p.filters.foo).toBeUndefined();
    expect(p.tab).toBe("patterns");
  });
});
