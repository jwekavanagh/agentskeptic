/** Max Unicode code points per attribution field (surface-impression). */
export const ATTRIBUTION_UTM_MAX_CODEPOINTS = 128;
export const ATTRIBUTION_PATH_MAX_CODEPOINTS = 512;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type FunnelSurfaceAttributionKey =
  | (typeof UTM_KEYS)[number]
  | "landing_path"
  | "referrer_path";

export type NormalizedFunnelSurfaceAttribution = Partial<
  Record<FunnelSurfaceAttributionKey, string>
>;

/** Unicode code point count (not UTF-16 length). */
export function countUnicodeCodePoints(s: string): number {
  return [...s].length;
}

function hasControlChar(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp <= 0x1f) return true;
    if (cp >= 0x7f && cp <= 0x9f) return true;
  }
  return false;
}

function assertNoProtocol(s: string): void {
  if (s.includes("://")) {
    throw new Error("ATTRIBUTION_PROTOCOL");
  }
}

function trimAndValidateValue(
  raw: unknown,
  maxCodePoints: number,
  field: string,
): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") {
    throw new Error(`ATTRIBUTION_TYPE_${field}`);
  }
  const t = raw.trim();
  if (t.length === 0) return undefined;
  if (hasControlChar(t)) {
    throw new Error(`ATTRIBUTION_CONTROL_${field}`);
  }
  assertNoProtocol(t);
  if (countUnicodeCodePoints(t) > maxCodePoints) {
    throw new Error(`ATTRIBUTION_LENGTH_${field}`);
  }
  return t;
}

/**
 * Normalize and validate `attribution` from POST /api/funnel/surface-impression.
 * Rejects whole payload on any rule violation (caller returns 400, no funnel row).
 */
export function normalizeFunnelSurfaceAttribution(
  raw: unknown,
): NormalizedFunnelSurfaceAttribution {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("ATTRIBUTION_ROOT");
  }
  const obj = raw as Record<string, unknown>;
  const out: NormalizedFunnelSurfaceAttribution = {};

  for (const k of UTM_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const v = trimAndValidateValue(obj[k], ATTRIBUTION_UTM_MAX_CODEPOINTS, k);
      if (v !== undefined) {
        out[k] = v;
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(obj, "landing_path")) {
    const v = trimAndValidateValue(
      obj.landing_path,
      ATTRIBUTION_PATH_MAX_CODEPOINTS,
      "landing_path",
    );
    if (v !== undefined) {
      out.landing_path = v;
    }
  }
  if (Object.prototype.hasOwnProperty.call(obj, "referrer_path")) {
    const v = trimAndValidateValue(
      obj.referrer_path,
      ATTRIBUTION_PATH_MAX_CODEPOINTS,
      "referrer_path",
    );
    if (v !== undefined) {
      out.referrer_path = v;
    }
  }

  for (const key of Object.keys(obj)) {
    if (
      key !== "landing_path" &&
      key !== "referrer_path" &&
      !(UTM_KEYS as readonly string[]).includes(key)
    ) {
      throw new Error(`ATTRIBUTION_UNKNOWN_${key}`);
    }
  }

  return out;
}

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isFunnelAnonUuidV4(raw: string): boolean {
  return UUID_V4_RE.test(raw.trim());
}

export function resolveFunnelAnonId(bodyFunnelAnonId: string | undefined): string {
  const t = bodyFunnelAnonId?.trim();
  if (t && isFunnelAnonUuidV4(t)) {
    return t.toLowerCase();
  }
  return crypto.randomUUID();
}

