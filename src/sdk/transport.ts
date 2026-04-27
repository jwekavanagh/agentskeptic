/**
 * Hand-written HTTP client for commercial activation endpoints. Types from OpenAPI;
 * implementation is not generated.
 */
import { CLI_OPERATIONAL_CODES } from "../cliOperationalCodes.js";
import { TruthLayerError } from "../truthLayerError.js";
import { LICENSE_API_BASE_URL } from "../generated/commercialBuildFlags.js";
import { fetchWithTimeout } from "../telemetry/fetchWithTimeout.js";
import type { components } from "./_generated/openapi-types.js";

type ReserveIntent = "verify" | "enforce";

const RETRY_MS = [250, 750, 2250] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function baseUrl(): string {
  return LICENSE_API_BASE_URL.replace(/\/$/, "");
}

function requestIdSuffix(res: Response): string {
  const rid = res.headers.get("x-request-id")?.trim();
  return rid ? ` [x-request-id=${rid}]` : "";
}

type ReserveOk = components["schemas"]["ReserveAllowed"];
type ReserveBody = ReserveOk | (components["schemas"]["ReserveError"] & { allowed: false });

function resolveApiKey(): string | null {
  return (
    process.env.AGENTSKEPTIC_API_KEY?.trim() ||
    process.env.WORKFLOW_VERIFIER_API_KEY?.trim() ||
    null
  );
}

/**
 * POST /api/v1/usage/reserve — same behavior as legacy `licensePreflight` (retries, error mapping).
 */
export async function postUsageReserve(input: {
  intent: ReserveIntent;
  runId: string;
  issuedAtIso: string;
  xRequestId: string;
  apiKey: string;
}): Promise<void> {
  const url = `${baseUrl()}/api/v1/usage/reserve`;
  const body: components["schemas"]["ReserveRequest"] = {
    run_id: input.runId,
    issued_at: input.issuedAtIso,
    intent: input.intent,
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "x-request-id": input.xRequestId,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let parsed: ReserveBody | null = null;
      try {
        parsed = JSON.parse(text) as ReserveBody;
      } catch {
        parsed = null;
      }

      const rid = requestIdSuffix(res);

      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        lastErr = new Error(`HTTP ${res.status}${rid}`);
        if (attempt < RETRY_MS.length) await sleep(RETRY_MS[attempt]!);
        continue;
      }

      if (!res.ok) {
        if (parsed && typeof parsed === "object" && "allowed" in parsed && parsed.allowed === false) {
          const body = parsed as Extract<ReserveBody, { allowed: false }>;
          mapReserveDenyToTruthError(body, rid);
        }
        throw new TruthLayerError(
          CLI_OPERATIONAL_CODES.LICENSE_DENIED,
          `License check failed with HTTP ${res.status}.${rid}`,
        );
      }

      if (!parsed || typeof parsed !== "object" || !("allowed" in parsed) || parsed.allowed !== true) {
        throw new TruthLayerError(
          CLI_OPERATIONAL_CODES.LICENSE_DENIED,
          `License server returned an unexpected response.${rid}`,
        );
      }
      return;
    } catch (e) {
      if (e instanceof TruthLayerError) throw e;
      lastErr = e;
      if (attempt < RETRY_MS.length) await sleep(RETRY_MS[attempt]!);
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown");
  throw new TruthLayerError(
    CLI_OPERATIONAL_CODES.LICENSE_USAGE_UNAVAILABLE,
    `Could not reach license service after retries: ${msg}`,
  );
}

function mapReserveDenyToTruthError(body: Extract<ReserveBody, { allowed: false }>, rid: string): never {
  const code = body.code;
  if (code === "ENFORCEMENT_REQUIRES_PAID_PLAN") {
    const suffix = body.upgrade_url ? ` ${body.upgrade_url}` : "";
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.ENFORCEMENT_REQUIRES_PAID_PLAN,
      `${body.message || "Enforcement requires a paid plan."}${suffix}${rid}`,
    );
  }
  if (code === "VERIFICATION_REQUIRES_SUBSCRIPTION") {
    const suffix = body.upgrade_url ? ` ${body.upgrade_url}` : "";
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.VERIFICATION_REQUIRES_SUBSCRIPTION,
      `${body.message || "Licensed verification requires an active subscription."}${suffix}${rid}`,
    );
  }
  if (code === "SUBSCRIPTION_INACTIVE") {
    const suffix = body.upgrade_url ? ` ${body.upgrade_url}` : "";
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${body.message || "Subscription is not active for licensed verification or CI enforcement."}${suffix}${rid}`,
    );
  }
  if (code === "BILLING_PRICE_UNMAPPED") {
    const suffix = body.upgrade_url ? ` ${body.upgrade_url}` : "";
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${body.message || "Stripe price is not mapped in this deployment."}${suffix}${rid}`,
    );
  }
  if (code === "INSUFFICIENT_SCOPE") {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${body.message || "API key does not include required scope for this operation."}${rid}`,
    );
  }
  if (code === "KEY_EXPIRED") {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${body.message || "API key is expired."}${rid}`,
    );
  }
  if (code === "KEY_REVOKED") {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${body.message || "API key is revoked."}${rid}`,
    );
  }
  if (code === "KEY_DISABLED") {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_DENIED,
      `${body.message || "API key is disabled."}${rid}`,
    );
  }
  throw new TruthLayerError(
    CLI_OPERATIONAL_CODES.LICENSE_DENIED,
    `${body.message || `License check failed (${code}).`}${rid}`,
  );
}

/** GET /api/v1/usage/current */
export async function getUsageCurrentJson(): Promise<components["schemas"]["UsageCurrentV1"]> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_KEY_MISSING,
      "Commercial agentskeptic requires AGENTSKEPTIC_API_KEY.",
    );
  }
  const url = `${baseUrl()}/api/v1/usage/current`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-request-id": crypto.randomUUID(),
    },
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = null;
  }
  if (!res.ok || !parsed || typeof parsed !== "object") {
    throw new TruthLayerError(
      CLI_OPERATIONAL_CODES.LICENSE_USAGE_UNAVAILABLE,
      `Could not load current usage (HTTP ${res.status}).`,
    );
  }
  return parsed as components["schemas"]["UsageCurrentV1"];
}

/** POST /api/v1/funnel/verify-outcome (best-effort; swallow errors). */
export async function postVerifyOutcomeBestEffort(input: {
  url: string;
  body: unknown;
  headers: Record<string, string>;
  timeoutMs: number;
}): Promise<void> {
  try {
    await fetchWithTimeout(
      input.url,
      {
        method: "POST",
        headers: input.headers,
        body: JSON.stringify(input.body),
      },
      input.timeoutMs,
    );
  } catch {
    /* ignore */
  }
}

/** POST enforcement routes with JSON body. Returns ok, status, parsed body, request id. */
export async function postEnforcementJson(input: {
  path: "/api/v1/enforcement/baselines" | "/api/v1/enforcement/check" | "/api/v1/enforcement/accept";
  payload: Record<string, unknown>;
  apiKey: string;
}): Promise<{ ok: boolean; status: number; body: unknown; requestId: string | null }> {
  const xRequestId = crypto.randomUUID();
  const url = `${baseUrl()}${input.path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "x-request-id": xRequestId,
    },
    body: JSON.stringify(input.payload),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body, requestId: res.headers.get("x-request-id") };
}

export { resolveApiKey };
