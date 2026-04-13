import type { ParsedBootstrapPackInput } from "./parseBootstrapPackInput.js";

/**
 * Deterministic NDJSON UTF-8 for Quick ingest (one wrapped tool_calls object per line).
 */
export function synthesizeQuickInputUtf8FromOpenAiV1(input: ParsedBootstrapPackInput): string {
  const lines = input.toolCalls.map((tc) =>
    JSON.stringify({
      tool_calls: [
        {
          id: tc.id,
          type: "function",
          function: { name: tc.function.name, arguments: tc.function.arguments },
        },
      ],
    }),
  );
  return `${lines.join("\n")}\n`;
}
