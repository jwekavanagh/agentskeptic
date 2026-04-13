import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import { loadSchemaValidator } from "../schemaLoad.js";
import { TruthLayerError } from "../truthLayerError.js";

export type ParsedBootstrapPackInput = {
  workflowId: string;
  toolCalls: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Parse and validate `BootstrapPackInput` v1 per docs/bootstrap-pack-normative.md.
 * @throws TruthLayerError with BOOTSTRAP_* codes
 */
export function parseBootstrapPackInputJson(rawUtf8: string): ParsedBootstrapPackInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawUtf8) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
      `Bootstrap input is not valid JSON: ${msg}`,
    );
  }

  const validate = loadSchemaValidator("bootstrap-pack-input-v1");
  if (!validate(parsed)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
      JSON.stringify(validate.errors ?? []),
    );
  }

  const root = parsed as Record<string, unknown>;
  const workflowId = root.workflowId;
  if (typeof workflowId !== "string") {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID, "workflowId must be a string.");
  }

  const oc = root.openaiChatCompletion;
  if (!isPlainObject(oc)) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID, "openaiChatCompletion must be an object.");
  }
  const choices = oc.choices;
  if (!Array.isArray(choices) || choices.length < 1) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID, "choices must be a non-empty array.");
  }
  const c0 = choices[0];
  if (!isPlainObject(c0)) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID, "choices[0] must be an object.");
  }
  const message = c0.message;
  if (!isPlainObject(message)) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID, "choices[0].message must be an object.");
  }
  const toolCallsRaw = message.tool_calls;
  if (!Array.isArray(toolCallsRaw)) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID, "choices[0].message.tool_calls must be an array.");
  }
  if (toolCallsRaw.length === 0) {
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.BOOTSTRAP_NO_TOOL_CALLS, "tool_calls is empty.");
  }

  const toolCalls: ParsedBootstrapPackInput["toolCalls"] = [];
  for (let i = 0; i < toolCallsRaw.length; i++) {
    const tc = toolCallsRaw[i];
    if (!isPlainObject(tc)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
        `tool_calls[${i}] must be an object.`,
      );
    }
    if (tc.type !== "function") {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
        `tool_calls[${i}].type must be "function".`,
      );
    }
    const id = tc.id;
    if (typeof id !== "string" || id.length === 0) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
        `tool_calls[${i}].id must be a non-empty string.`,
      );
    }
    const fn = tc.function;
    if (!isPlainObject(fn)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
        `tool_calls[${i}].function must be an object.`,
      );
    }
    const name = fn.name;
    const argsStr = fn.arguments;
    if (typeof name !== "string" || name.length === 0) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
        `tool_calls[${i}].function.name must be a non-empty string.`,
      );
    }
    if (typeof argsStr !== "string") {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_INPUT_INVALID,
        `tool_calls[${i}].function.arguments must be a string.`,
      );
    }
    let argsParsed: unknown;
    try {
      argsParsed = JSON.parse(argsStr) as unknown;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_TOOL_CALL_ARGUMENTS_INVALID,
        `JSON.parse(function.arguments) failed (tool_calls[i] i=${i}): ${msg}`,
      );
    }
    if (argsParsed === null || typeof argsParsed !== "object" || Array.isArray(argsParsed)) {
      throw new TruthLayerError(
        CLI_OPERATIONAL_CODES.BOOTSTRAP_TOOL_CALL_ARGUMENTS_INVALID,
        `function.arguments must parse to a JSON object, not array or primitive (tool_calls[i] i=${i}).`,
      );
    }
    toolCalls.push({
      id,
      function: { name, arguments: argsStr },
    });
  }

  return { workflowId, toolCalls };
}
