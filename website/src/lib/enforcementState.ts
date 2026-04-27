import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { enforcementBaselines, enforcementEvents } from "@/db/schema";

export type EnforcementProjectionInput = {
  run_id: string;
  workflow_id: string;
  projection_hash: string;
  projection: unknown;
};

export function parseProjectionInput(body: unknown): EnforcementProjectionInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const run_id = typeof b.run_id === "string" ? b.run_id.trim() : "";
  const workflow_id = typeof b.workflow_id === "string" ? b.workflow_id.trim() : "";
  const projection_hash = typeof b.projection_hash === "string" ? b.projection_hash.trim() : "";
  if (!run_id || !workflow_id || !projection_hash || b.projection === undefined) return null;
  return { run_id, workflow_id, projection_hash, projection: b.projection };
}

export async function upsertBaseline(input: {
  userId: string;
  keyId: string;
  workflowId: string;
  projectionHash: string;
  projection: unknown;
}): Promise<void> {
  const existing = await db
    .select()
    .from(enforcementBaselines)
    .where(and(eq(enforcementBaselines.userId, input.userId), eq(enforcementBaselines.workflowId, input.workflowId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(enforcementBaselines).values({
      userId: input.userId,
      workflowId: input.workflowId,
      projectionHash: input.projectionHash,
      projection: input.projection as Record<string, unknown>,
      acceptedByKeyId: input.keyId,
    });
    return;
  }
  await db
    .update(enforcementBaselines)
    .set({
      projectionHash: input.projectionHash,
      projection: input.projection as Record<string, unknown>,
      acceptedByKeyId: input.keyId,
      updatedAt: new Date(),
    })
    .where(eq(enforcementBaselines.id, existing[0]!.id));
}

export async function getBaseline(input: {
  userId: string;
  workflowId: string;
}): Promise<(typeof enforcementBaselines.$inferSelect) | null> {
  const rows = await db
    .select()
    .from(enforcementBaselines)
    .where(and(eq(enforcementBaselines.userId, input.userId), eq(enforcementBaselines.workflowId, input.workflowId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function appendEnforcementEvent(input: {
  userId: string;
  workflowId: string;
  runId: string;
  event: "baseline_created" | "check_pass" | "drift_detected" | "drift_accepted";
  expectedProjectionHash: string | null;
  actualProjectionHash: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(enforcementEvents).values({
    userId: input.userId,
    workflowId: input.workflowId,
    runId: input.runId,
    event: input.event,
    expectedProjectionHash: input.expectedProjectionHash,
    actualProjectionHash: input.actualProjectionHash,
    metadata: input.metadata ?? null,
  });
}

export async function listEnforcementHistory(input: {
  userId: string;
  workflowId: string;
  limit?: number;
}): Promise<Array<typeof enforcementEvents.$inferSelect>> {
  const n = Math.max(1, Math.min(200, input.limit ?? 50));
  return await db
    .select()
    .from(enforcementEvents)
    .where(and(eq(enforcementEvents.userId, input.userId), eq(enforcementEvents.workflowId, input.workflowId)))
    .orderBy(desc(enforcementEvents.createdAt))
    .limit(n);
}

