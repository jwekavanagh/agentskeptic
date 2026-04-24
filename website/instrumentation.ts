import { assertProductionCommercialGuards } from "@/lib/assertProductionCommercialGuards";
import { isProductionLike } from "@/lib/canonicalSiteOrigin";
import { ensureSslModeRequire } from "@/db/ensureSslModeRequire";

/**
 * `coreDatabaseBoundary` uses `node:fs` / `node:crypto` and must not be a static import here:
 * bundlers (including Turbopack on `next build`) may include instrumentation in an Edge graph and
 * then error on those APIs. Dynamic import keeps it on the Node server runtime only.
 */
export const TELEMETRY_DATABASE_URL_REQUIRED_MESSAGE =
  "AGENTSKEPTIC_TELEMETRY_DATABASE_URL_REQUIRED: TELEMETRY_DATABASE_URL must be set when VERCEL_ENV=production (see docs/telemetry-storage.md)";

function assertProductionTelemetryDatabaseConfigured(): void {
  if (!isProductionLike()) {
    return;
  }
  if (!process.env.TELEMETRY_DATABASE_URL?.trim()) {
    throw new Error(TELEMETRY_DATABASE_URL_REQUIRED_MESSAGE);
  }
}

export async function register(): Promise<void> {
  assertProductionCommercialGuards();
  assertProductionTelemetryDatabaseConfigured();
  const raw = process.env.DATABASE_URL?.trim();
  if (raw) {
    const { assertCoreDatabaseBoundary } = await import("@/lib/coreDatabaseBoundary");
    assertCoreDatabaseBoundary(ensureSslModeRequire(raw));
  }
}
