/** Deterministic canonical form for params equality (divergence contract) and observed execution digest. */
export function canonicalJsonForParams(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((el) => canonicalJsonForParams(el)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonForParams((value as Record<string, unknown>)[k])}`);
    return `{${parts.join(",")}}`;
  }
  return `__non_json_params:${typeof value}__`;
}
