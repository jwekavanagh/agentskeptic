/**
 * CSP is built per request in `middleware.ts` (nonce + `strict-dynamic`) so
 * `script-src` never needs `unsafe-inline`. Other headers stay here for `next.config.ts` and tests.
 * @see docs/website-security-and-operations.md
 */

export type CommercialSiteCspOptions = {
  /** Next.js webpack dev / HMR may rely on `eval`. Omit in production CSP. */
  allowEval?: boolean;
  /**
   * When true (default), emit `upgrade-insecure-requests` (typical for https production).
   * Omit on plain `http:` (e.g. `next dev`) so same-origin `fetch("/api/...")` is not upgraded to https
   * without a TLS listener (browsers surface that as "Failed to fetch").
   */
  upgradeInsecureRequests?: boolean;
};

/**
 * Single source for CSP directive text. Call from middleware with a fresh nonce per request.
 */
export function buildCommercialSiteContentSecurityPolicy(
  nonce: string,
  options: CommercialSiteCspOptions = {},
): string {
  const allowEval = options.allowEval ?? false;
  const upgradeInsecure = options.upgradeInsecureRequests ?? true;
  const evalPart = allowEval ? " 'unsafe-eval'" : "";
  const upgradePart = upgradeInsecure ? "upgrade-insecure-requests; " : "";
  return (
    "default-src 'self'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "object-src 'none'; " +
    upgradePart +
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalPart} https://va.vercel-scripts.com; ` +
    "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com; " +
    "img-src 'self' data: blob:; " +
    "style-src 'self'; " +
    "font-src 'self' data:;"
  );
}

export const COMMERCIAL_SITE_SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** Request header carrying the per-request nonce for app inline scripts (middleware sets this). */
export const COMMERCIAL_SITE_CSP_NONCE_HEADER = "x-csp-nonce";
