import type { OperationalCode } from "./failureCatalog.js";

export class TruthLayerError extends Error {
  readonly code: OperationalCode | string;

  constructor(code: OperationalCode | string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TruthLayerError";
    this.code = code;
  }
}
