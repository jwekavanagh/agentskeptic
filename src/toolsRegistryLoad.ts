import { readFileSync } from "fs";
import { CLI_OPERATIONAL_CODES } from "./failureCatalog.js";
import { loadSchemaValidator } from "./schemaLoad.js";
import { TruthLayerError } from "./truthLayerError.js";
import type { ToolRegistryEntry } from "./types.js";

const validateRegistry = loadSchemaValidator("tools-registry");

/**
 * Read registry file, parse JSON, validate against tools-registry schema.
 * Does not call {@link buildRegistryMap} (duplicate toolId is handled by callers).
 */
export function loadRegistryEntriesAfterSchema(registryPath: string): ToolRegistryEntry[] {
  let raw: string;
  try {
    raw = readFileSync(registryPath, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.REGISTRY_READ_FAILED, msg, { cause: e });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new TruthLayerError(CLI_OPERATIONAL_CODES.REGISTRY_JSON_SYNTAX, msg, { cause: e });
  }
  if (!validateRegistry(parsed)) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.REGISTRY_SCHEMA_INVALID,
      JSON.stringify(validateRegistry.errors ?? []),
    );
  }
  return parsed as ToolRegistryEntry[];
}
