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
  const row = result[0] as { n: number } | undefined;
  return row?.n ?? 0;
}
