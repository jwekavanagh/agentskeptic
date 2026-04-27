import catalog from "../../schemas/agentskeptic-error-codes.json" with { type: "json" };

export type ErrorCodeEntry = {
  code: string;
  category: string;
  httpStatus: number | null;
  retryable: boolean;
  remediation: string;
};

const entries = catalog.entries as ErrorCodeEntry[];

const byCode = new Map<string, ErrorCodeEntry>();
for (const e of entries) {
  byCode.set(e.code, e);
}

export const agentSkepticErrorEntries: readonly ErrorCodeEntry[] = entries;

/** All known AgentSkeptic machine codes (subset of TruthLayer operational + wire codes). */
export type AgentSkepticErrorCode = string;

export class AgentSkepticError extends Error {
  readonly code: AgentSkepticErrorCode;
  readonly category: string;
  readonly retryable: boolean;
  readonly remediation: string | undefined;
  readonly requestId: string | null | undefined;

  constructor(
    code: AgentSkepticErrorCode | (string & {}),
    message: string,
    options?: { cause?: unknown; requestId?: string | null },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "AgentSkepticError";
    this.code = String(code);
    const meta = byCode.get(this.code);
    this.category = meta?.category ?? "unknown";
    this.retryable = meta?.retryable ?? false;
    this.remediation = meta?.remediation;
    this.requestId = options?.requestId;
  }
}

export function lookupErrorCodeMeta(code: string): ErrorCodeEntry | undefined {
  return byCode.get(code);
}
