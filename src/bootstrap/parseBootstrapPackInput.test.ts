import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import { TruthLayerError } from "../truthLayerError.js";
import { parseBootstrapPackInputJson } from "./parseBootstrapPackInput.js";
import { synthesizeQuickInputUtf8FromOpenAiV1 } from "./synthesizeQuickInputFromOpenAiV1.js";

const root = process.cwd();
const goldenInput = readFileSync(
  path.join(root, "test", "fixtures", "bootstrap-pack", "input.json"),
  "utf8",
);

describe("parseBootstrapPackInputJson", () => {
  it("parses fixture and preserves tool call arguments verbatim", () => {
    const p = parseBootstrapPackInputJson(goldenInput);
    expect(p.workflowId).toBe("wf_bootstrap_fixture");
    expect(p.toolCalls).toHaveLength(1);
    expect(p.toolCalls[0]!.function.name).toBe("crm.upsert_contact");
    expect(p.toolCalls[0]!.function.arguments).toBe(
      '{"recordId":"c_ok","fields":{"name":"Alice","status":"active"}}',
    );
  });

  it("rejects empty tool_calls", () => {
    const raw = readFileSync(
      path.join(root, "test", "fixtures", "bootstrap-pack", "input-empty-tool-calls.json"),
      "utf8",
    );
    expect(() => parseBootstrapPackInputJson(raw)).toThrow(TruthLayerError);
    try {
      parseBootstrapPackInputJson(raw);
    } catch (e) {
      expect((e as TruthLayerError).code).toBe(CLI_OPERATIONAL_CODES.BOOTSTRAP_NO_TOOL_CALLS);
    }
  });
});

describe("synthesizeQuickInputUtf8FromOpenAiV1", () => {
  it("emits one NDJSON line per tool call with stable key order", () => {
    const p = parseBootstrapPackInputJson(goldenInput);
    const utf8 = synthesizeQuickInputUtf8FromOpenAiV1(p);
    const lines = utf8.trim().split("\n");
    expect(lines).toHaveLength(1);
    const line = JSON.parse(lines[0]!) as {
      tool_calls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
    };
    expect(line.tool_calls).toHaveLength(1);
    expect(line.tool_calls[0]!.id).toBe("call_fixture_1");
    expect(line.tool_calls[0]!.type).toBe("function");
    expect(line.tool_calls[0]!.function.name).toBe("crm.upsert_contact");
    expect(JSON.parse(line.tool_calls[0]!.function.arguments)).toEqual({
      recordId: "c_ok",
      fields: { name: "Alice", status: "active" },
    });
  });
});
