import type { OperationalCode } from "./failureCatalog.js";
import { AgentSkepticError } from "./sdk/errors.js";

/**
 * @deprecated since 2.0.0 — prefer `AgentSkepticError` from the unified error model (`import { AgentSkepticError } from "agentskeptic"`). This class remains for backward compatibility.
 */
export class TruthLayerError extends AgentSkepticError {
  constructor(code: OperationalCode | string, message: string, options?: { cause?: unknown }) {
    super(String(code), message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "TruthLayerError";
  }
}
