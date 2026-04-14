import { db } from "@/db/client";
import { funnelEvents } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

function coerceCount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normative repeat-day count for reserve_allowed funnel rows (UTC calendar dates).
 * SQL lives only in this module — do not duplicate in tests or docs.
 */
export async function countDistinctReserveDaysForUser(userId: string): Promise<number> {
  const [row] = await db
    .select({
      n: sql<number>`count(distinct (${funnelEvents.createdAt} AT TIME ZONE 'UTC')::date)::int`,
    })
    .from(funnelEvents)
    .where(and(eq(funnelEvents.userId, userId), eq(funnelEvents.event, "reserve_allowed")));
  return coerceCount(row?.n);
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

  const [row] = await db
    .select({
      n: sql<number>`count(distinct (${funnelEvents.createdAt} AT TIME ZONE 'UTC')::date)::int`,
    })
    .from(funnelEvents)
    .where(
      and(
        eq(funnelEvents.userId, userId),
        eq(funnelEvents.event, "reserve_allowed"),
        gte(funnelEvents.createdAt, start),
        lt(funnelEvents.createdAt, end),
      ),
    );
  return coerceCount(row?.n);
}
