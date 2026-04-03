import { describe, it, expect } from "vitest";
import {
  CLI_OPERATIONAL_CODES,
  OPERATIONAL_MESSAGE_MAX_CHARS,
  formatOperationalMessage,
  runLevelIssue,
} from "./failureCatalog.js";

describe("failureCatalog", () => {
  it("CLI_OPERATIONAL_CODES values are unique", () => {
    const values = Object.values(CLI_OPERATIONAL_CODES);
    expect(new Set(values).size).toBe(values.length);
  });

  it("formatOperationalMessage normalizes whitespace and truncates", () => {
    expect(formatOperationalMessage("a\tb\nc")).toBe("a b c");
    expect(formatOperationalMessage("  x  y  ")).toBe("x y");
    const long = "a".repeat(OPERATIONAL_MESSAGE_MAX_CHARS + 100);
    const out = formatOperationalMessage(long);
    expect(out.length).toBe(OPERATIONAL_MESSAGE_MAX_CHARS);
    expect(out.endsWith("...")).toBe(true);
  });

  it("runLevelIssue returns fixed literals", () => {
    const m = runLevelIssue("MALFORMED_EVENT_LINE");
    expect(m.code).toBe("MALFORMED_EVENT_LINE");
    expect(m.message).toContain("tool observation");
    const n = runLevelIssue("NO_STEPS_FOR_WORKFLOW");
    expect(n.code).toBe("NO_STEPS_FOR_WORKFLOW");
    expect(n.message).toBe("No tool_observed events for this workflow id after filtering.");
  });
});
