import { getCanonicalSiteOrigin, isProductionLike } from "@/lib/canonicalSiteOrigin";
import type { NextRequest } from "next/server";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** `URL.hostname` uses bracket form for IPv6 literals (e.g. `[::1]`, not `::1`). */
function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function allowLoopbackOriginAlias(): boolean {
  const n = process.env.NODE_ENV;
  if (!n || n === "development" || n === "test") return true;
  // Local `next start`: production NODE_ENV but not Vercel production — same loopback UX as dev.
  if (n === "production" && !isProductionLike() && process.env.VERCEL !== "1") {
    return true;
  }
  return false;
}

/**
 * Same-origin check for funnel and integrator browser POSTs.
 * In local dev (and local `next start` without Vercel), `localhost` and `127.0.0.1` (same port and scheme)
 * match each other so `fetch("/api/...")` from `http://localhost:3000` still passes when the canonical
 * default is `http://127.0.0.1:<PORT>`.
 */
function funnelOriginMatchesCanonical(requestOrigin: string, canonical: string): boolean {
  if (requestOrigin === canonical) return true;

  if (!allowLoopbackOriginAlias()) return false;

  let reqUrl: URL;
  let canUrl: URL;
  try {
    reqUrl = new URL(requestOrigin);
    canUrl = new URL(canonical);
  } catch {
    return false;
  }

  if (reqUrl.protocol !== canUrl.protocol || reqUrl.port !== canUrl.port) return false;
  if (!isLoopbackHostname(reqUrl.hostname) || !isLoopbackHostname(canUrl.hostname)) return false;
  return true;
}

/**
 * When `NEXT_PUBLIC_APP_URL` pins port 3000 but `next dev` listens on 3001, Origin/referer origins still
 * match this request's `Host` header — allow only for loopback + dev-like environments.
 */
function loopbackOriginMatchesRequestHost(req: NextRequest, requestOrigin: string): boolean {
  if (!allowLoopbackOriginAlias()) return false;
  const hostHeader = req.headers.get("host")?.trim().toLowerCase();
  if (!hostHeader) return false;
  let o: URL;
  try {
    o = new URL(requestOrigin);
  } catch {
    return false;
  }
  if (!isLoopbackHostname(o.hostname)) return false;
  return o.host.toLowerCase() === hostHeader;
}

function funnelOriginAllowedForRequest(req: NextRequest, requestOrigin: string, canonical: string): boolean {
  return (
    funnelOriginMatchesCanonical(requestOrigin, canonical) ||
    loopbackOriginMatchesRequestHost(req, requestOrigin)
  );
}

/**
 * True when Origin or Referer matches the canonical site origin (same policy as getCanonicalSiteOrigin).
 */
export function isFunnelSurfaceRequestOriginAllowed(req: NextRequest): boolean {
  let canonical: string;
  try {
    canonical = getCanonicalSiteOrigin();
  } catch {
    return false;
  }

  const originHeader = req.headers.get("origin");
  if (originHeader) {
    try {
      const o = new URL(originHeader).origin;
      if (funnelOriginAllowedForRequest(req, o, canonical)) return true;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const o = new URL(referer).origin;
      if (funnelOriginAllowedForRequest(req, o, canonical)) return true;
    } catch {
      return false;
    }
  }

  return false;
}
