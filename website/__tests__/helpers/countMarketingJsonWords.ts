/**
 * Sum whitespace-separated word counts of every string in a JSON tree
 * (optional: omit shareableTerminalDemo.transcript for "prose" budget).
 */
export function countJsonStringWords(
  o: unknown,
  opts?: { omitTranscript?: boolean },
): number {
  if (typeof o === "string") {
    return o
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }
  if (Array.isArray(o)) {
    return o.reduce((a, b) => a + countJsonStringWords(b, opts), 0);
  }
  if (o && typeof o === "object") {
    if (opts?.omitTranscript && "shareableTerminalDemo" in (o as Record<string, unknown>)) {
      const c = { ...(o as Record<string, unknown>) };
      const demo = c.shareableTerminalDemo as Record<string, unknown>;
      c.shareableTerminalDemo = { ...demo, transcript: "" };
      return countJsonStringWords(c, { omitTranscript: false });
    }
    return Object.values(o).reduce((a, b) => a + countJsonStringWords(b, opts), 0);
  }
  return 0;
}
