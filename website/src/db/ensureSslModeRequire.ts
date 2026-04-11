/**
 * Supabase requires sslmode=require in server environments like Vercel to avoid certificate chain errors
 * (e.g. SELF_SIGNED_CERT_IN_CHAIN during TLS negotiation when sslmode is omitted or set to verify-full).
 *
 * `postgres.js` maps `sslmode=require` from the URL to TLS with a compatible trust mode for managed Postgres.
 * `drizzle-kit migrate` uses the same connection string.
 *
 * Local Docker Postgres (localhost / 127.0.0.1) is left unchanged so dev DBs without TLS still work.
 */
export function ensureSslModeRequire(connectionUrl: string): string {
  const t = connectionUrl.trim();
  if (!t) return t;
  const proto = t.match(/^postgres(ql)?:/i)?.[0]?.toLowerCase();
  if (proto !== "postgres:" && proto !== "postgresql:") {
    return t;
  }

  let hostname: string;
  try {
    const forParse = t.replace(/^postgres(ql)?:\/\//i, "http://");
    hostname = new URL(forParse).hostname.toLowerCase();
  } catch {
    return t;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return t;
  }

  if (/[?&]sslmode=require(?:&|$)/i.test(t)) {
    return t;
  }
  if (/[?&]sslmode=/i.test(t)) {
    return t.replace(/([?&])sslmode=[^&]*/gi, "$1sslmode=require");
  }
  return `${t}${t.includes("?") ? "&" : "?"}sslmode=require`;
}
