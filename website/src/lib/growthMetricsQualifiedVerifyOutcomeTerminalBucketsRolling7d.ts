import { dbTelemetry } from "@/db/telemetryClient";
import { sql } from "drizzle-orm";

/**
 * Executable mirror — must match docs/growth-metrics-ssot.md §Counts_QualifiedVerifyOutcomesByTerminalStatus_Rolling7dUtc
 * (enforced by growthMetricsSqlParity.test.ts).
 */
export const Counts_QualifiedVerifyOutcomesByTerminalStatus_Rolling7dUtc_SQL = `WITH w AS (
  SELECT (now() AT TIME ZONE 'UTC') AS now_utc
),
q AS (
  SELECT *
  FROM funnel_event, w
  WHERE event = 'verify_outcome'
    AND (metadata->>'telemetry_source' IS DISTINCT FROM 'local_dev')
    AND (metadata->>'workload_class') = 'non_bundled'
    AND created_at >= w.now_utc - interval '7 days'
),
agg AS (
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE metadata->>'terminal_status' = 'complete')::int AS complete,
    COUNT(*) FILTER (WHERE metadata->>'terminal_status' = 'inconsistent')::int AS inconsistent,
    COUNT(*) FILTER (WHERE metadata->>'terminal_status' = 'incomplete')::int AS incomplete
  FROM q
)
SELECT
  total,
  complete,
  inconsistent,
  incomplete,
  (total - complete - inconsistent - incomplete) AS malformed_other
FROM agg`;

export type QualifiedVerifyOutcomeTerminalBucketsRow = {
  total: number;
  complete: number;
  inconsistent: number;
  incomplete: number;
  malformed_other: number;
};

export async function getCountsQualifiedVerifyOutcomesByTerminalStatusRolling7d(): Promise<QualifiedVerifyOutcomeTerminalBucketsRow> {
  const rows = await dbTelemetry.execute(
    sql.raw(Counts_QualifiedVerifyOutcomesByTerminalStatus_Rolling7dUtc_SQL),
  );
  const row = rows[0] as QualifiedVerifyOutcomeTerminalBucketsRow | undefined;
  return {
    total: row?.total ?? 0,
    complete: row?.complete ?? 0,
    inconsistent: row?.inconsistent ?? 0,
    incomplete: row?.incomplete ?? 0,
    malformed_other: row?.malformed_other ?? 0,
  };
}
