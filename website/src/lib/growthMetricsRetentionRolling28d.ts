import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Executable mirror — must match docs/growth-metrics-ssot.md §Retention_ActiveReserveDays_ge2_Rolling28dUtc
 * (enforced by growthMetricsSqlParity.test.ts).
 */
export const Retention_ActiveReserveDays_ge2_Rolling28dUtc_SQL = `WITH w AS (
  SELECT (now() AT TIME ZONE 'UTC') AS t
),
denom AS (
  SELECT DISTINCT fe.user_id
  FROM funnel_event fe
  CROSS JOIN w
  WHERE fe.event = 'reserve_allowed'
    AND fe.user_id IS NOT NULL
    AND fe.created_at >= w.t - interval '28 days'
),
num AS (
  SELECT d.user_id
  FROM denom d
  INNER JOIN funnel_event e ON e.user_id = d.user_id AND e.event = 'reserve_allowed'
  CROSS JOIN w
  WHERE e.created_at >= w.t - interval '28 days'
  GROUP BY d.user_id
  HAVING COUNT(DISTINCT (e.created_at AT TIME ZONE 'UTC')::date) >= 2
)
SELECT
  (SELECT COUNT(*)::int FROM num) AS numerator,
  (SELECT COUNT(*)::int FROM denom) AS denominator,
  (SELECT COUNT(*)::float FROM num) / NULLIF((SELECT COUNT(*)::float FROM denom), 0) AS rate`;

export type RetentionRateRow = { numerator: number; denominator: number; rate: number | null };

export async function getRetentionActiveReserveDaysRolling28d(): Promise<RetentionRateRow> {
  const rows = await db.execute(sql.raw(Retention_ActiveReserveDays_ge2_Rolling28dUtc_SQL));
  const row = rows[0] as RetentionRateRow | undefined;
  return {
    numerator: row?.numerator ?? 0,
    denominator: row?.denominator ?? 0,
    rate: row?.rate ?? null,
  };
}
