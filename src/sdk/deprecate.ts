/**
 * One-time-per-process stderr deprecation notices for legacy public primitives (AgentSkeptic v2.0).
 * Suppress with AGENTSKEPTIC_SUPPRESS_DEPRECATION=1
 */

const warned = new Set<string>();

export function emitDeprecationOnce(symbol: string, replacementHint: string): void {
  if (process.env.AGENTSKEPTIC_SUPPRESS_DEPRECATION === "1") return;
  if (warned.has(symbol)) return;
  warned.add(symbol);
  process.stderr.write(
    `[agentskeptic] DEPRECATED: ${symbol} is deprecated since 2.0.0 and will be removed in a future major. ${replacementHint}\n`,
  );
}
