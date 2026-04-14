import { db } from "@/db/client";
import { sql } from "drizzle-orm";

/**
 * Normative repeat-day count for reserve_allowed funnel rows (UTC calendar dates).
 * SQL lives only in this module — do not duplicate in tests or docs.
 */
export async function countDistinctReserveDaysForUser(userId: string): Promise<number> {
  const result = await db.execute(
    sql`SELECT count(DISTINCT ("created_at" AT TIME ZONE 'UTC')::date)::int AS n
        FROM funnel_event
        WHERE user_id = ${userId} AND event = ${"reserve_allowed"}`,
  );
  const row = result[0] as { n: number | string | bigint } | undefined;
  const n = row?.n;
  if (n === undefined || n === null) return 0;
  return typeof n === "bigint" ? Number(n) : Number(n);
}

/** `yearMonth` format `YYYY-MM` (UTC month boundaries). */
export async function countDistinctReserveUtcDaysForUserInMonth(
  userId: string,
  yearMonth: string,
): Promise<number> {
  const parts = yearMonth.split("-");
  if (parts.length !== 2) return 0;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 0;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

  const result = await db.execute(sql`
    SELECT count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)::int AS n
    FROM funnel_event
    WHERE user_id = ${userId}
      AND event = ${"reserve_allowed"}
      AND created_at >= ${start}
      AND created_at < ${end}
  `);
  const row = result[0] as { n: number | string | bigint } | undefined;
  const n = row?.n;
  if (n === undefined || n === null) return 0;
  return typeof n === "bigint" ? Number(n) : Number(n);
}
