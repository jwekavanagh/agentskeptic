/**
 * Deterministic JSON: recursively sort every object’s keys (UTF-16 `localeCompare` en) before serialization.
 * Used for CLI stdout regression artifacts and certificate canonical digests.
 */
function canonicalizeForJson(x: unknown): unknown {
  if (x === null || typeof x !== "object") {
    return x;
  }
  if (Array.isArray(x)) {
    return x.map((e) => canonicalizeForJson(e));
  }
  const o = x as Record<string, unknown>;
  const keys = Object.keys(o).sort((a, b) => a.localeCompare(b, "en"));
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = canonicalizeForJson(o[k]);
  }
  return out;
}

export function stringifyWithSortedKeys(value: unknown): string {
  return JSON.stringify(canonicalizeForJson(value));
}
