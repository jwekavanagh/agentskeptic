import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Principal = {
  userId: string;
  keyId: string;
  source: "v2";
  label: string;
  scopes: Array<"meter">;
  status: "active";
  user: { plan: string; subscriptionStatus: string; stripePriceId: string | null };
};

const state = vi.hoisted(() => ({
  principal: {
    userId: "u1",
    keyId: "k1",
    source: "v2",
    label: "test",
    scopes: ["meter"] as Array<"meter">,
    status: "active" as const,
    user: { plan: "team", subscriptionStatus: "active", stripePriceId: null },
  } satisfies Principal,
  baselineByWorkflow: new Map<string, { hash: string; projection: unknown; acceptedBy: string }>(),
  events: [] as Array<{
    workflowId: string;
    runId: string;
    event: string;
    expected: string | null;
    actual: string;
  }>,
}));

vi.mock("@/lib/apiKeyAuthGateway", () => ({
  authenticateApiKey: vi.fn(async () => ({ ok: true, principal: state.principal })),
  requireScopes: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/enforcementState", () => ({
  parseProjectionInput: (body: unknown) => {
    if (!body || typeof body !== "object") return null;
    const b = body as Record<string, unknown>;
    if (
      typeof b.run_id !== "string" ||
      typeof b.workflow_id !== "string" ||
      typeof b.projection_hash !== "string" ||
      !Object.prototype.hasOwnProperty.call(b, "projection")
    ) {
      return null;
    }
    return {
      run_id: b.run_id as string,
      workflow_id: b.workflow_id as string,
      projection_hash: b.projection_hash as string,
      projection: b.projection,
    };
  },
  upsertBaseline: vi.fn(async (input: {
    workflowId: string;
    projectionHash: string;
    projection: unknown;
    keyId: string;
  }) => {
    state.baselineByWorkflow.set(input.workflowId, {
      hash: input.projectionHash,
      projection: input.projection,
      acceptedBy: input.keyId,
    });
  }),
  getBaseline: vi.fn(async (input: { workflowId: string }) => {
    const row = state.baselineByWorkflow.get(input.workflowId);
    if (!row) return null;
    return {
      id: "baseline-id",
      userId: "u1",
      workflowId: input.workflowId,
      projectionHash: row.hash,
      projection: row.projection as Record<string, unknown>,
      acceptedByKeyId: row.acceptedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),
  appendEnforcementEvent: vi.fn(async (input: {
    workflowId: string;
    runId: string;
    event: string;
    expectedProjectionHash: string | null;
    actualProjectionHash: string;
  }) => {
    state.events.push({
      workflowId: input.workflowId,
      runId: input.runId,
      event: input.event,
      expected: input.expectedProjectionHash,
      actual: input.actualProjectionHash,
    });
  }),
  listEnforcementHistory: vi.fn(async (input: { workflowId: string }) => {
    return state.events
      .filter((e) => e.workflowId === input.workflowId)
      .map((e) => ({
        id: crypto.randomUUID(),
        userId: "u1",
        workflowId: e.workflowId,
        runId: e.runId,
        event: e.event,
        expectedProjectionHash: e.expected,
        actualProjectionHash: e.actual,
        metadata: null,
        createdAt: new Date(),
      }));
  }),
}));

describe("enforcement state lifecycle", () => {
  beforeEach(() => {
    state.principal.user.plan = "team";
    state.principal.user.subscriptionStatus = "active";
    state.baselineByWorkflow.clear();
    state.events.length = 0;
  });

  it("baseline create -> enforce pass -> drift fail -> accept -> enforce pass", async () => {
    const { POST: createBaseline } = await import("@/app/api/v1/enforcement/baselines/route");
    const { POST: check } = await import("@/app/api/v1/enforcement/check/route");
    const { POST: accept } = await import("@/app/api/v1/enforcement/accept/route");

    const mkReq = (url: string, run: string, hash: string, projection: Record<string, unknown>) =>
      new NextRequest(url, {
        method: "POST",
        headers: { authorization: "Bearer wf_sk_test", "content-type": "application/json" },
        body: JSON.stringify({
          run_id: run,
          workflow_id: "wf-a",
          projection_hash: hash,
          projection,
        }),
      });

    const b = await createBaseline(mkReq("http://localhost/api/v1/enforcement/baselines", "r1", "h1", { a: 1 }));
    expect(b.status).toBe(200);
    expect((await b.json()).status).toBe("baseline_created");

    const pass = await check(mkReq("http://localhost/api/v1/enforcement/check", "r2", "h1", { a: 1 }));
    expect(pass.status).toBe(200);
    expect((await pass.json()).status).toBe("ok");

    const drift = await check(mkReq("http://localhost/api/v1/enforcement/check", "r3", "h2", { a: 2 }));
    expect(drift.status).toBe(200);
    expect((await drift.json()).status).toBe("drift");

    const ac = await accept(mkReq("http://localhost/api/v1/enforcement/accept", "r4", "h2", { a: 2 }));
    expect(ac.status).toBe(200);
    expect((await ac.json()).status).toBe("accepted");

    const pass2 = await check(mkReq("http://localhost/api/v1/enforcement/check", "r5", "h2", { a: 2 }));
    expect(pass2.status).toBe(200);
    expect((await pass2.json()).status).toBe("ok");
  });
});

describe("enforcement API entitlement and quota semantics", () => {
  it("starter cannot baseline/check/accept", async () => {
    state.principal.user.plan = "starter";
    state.principal.user.subscriptionStatus = "none";
    const { POST: createBaseline } = await import("@/app/api/v1/enforcement/baselines/route");
    const { POST: check } = await import("@/app/api/v1/enforcement/check/route");
    const { POST: accept } = await import("@/app/api/v1/enforcement/accept/route");
    const req = (url: string) =>
      new NextRequest(url, {
        method: "POST",
        headers: { authorization: "Bearer wf_sk_test", "content-type": "application/json" },
        body: JSON.stringify({
          run_id: "r1",
          workflow_id: "wf-ent",
          projection_hash: "h-ent",
          projection: { ok: true },
        }),
      });
    for (const fn of [createBaseline, check, accept]) {
      const res = await fn(req("http://localhost"));
      expect(res.status).toBe(403);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe("ENFORCEMENT_REQUIRES_PAID_PLAN");
    }
  });

  it("inactive paid user cannot baseline/check/accept", async () => {
    state.principal.user.plan = "team";
    state.principal.user.subscriptionStatus = "inactive";
    const { POST: createBaseline } = await import("@/app/api/v1/enforcement/baselines/route");
    const res = await createBaseline(
      new NextRequest("http://localhost/api/v1/enforcement/baselines", {
        method: "POST",
        headers: { authorization: "Bearer wf_sk_test", "content-type": "application/json" },
        body: JSON.stringify({
          run_id: "r2",
          workflow_id: "wf-ent",
          projection_hash: "h-ent2",
          projection: { ok: true },
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("SUBSCRIPTION_INACTIVE");
  });

  it("active paid user can baseline/check/accept and response marks quota path explicit", async () => {
    state.principal.user.plan = "team";
    state.principal.user.subscriptionStatus = "active";
    const { POST: createBaseline } = await import("@/app/api/v1/enforcement/baselines/route");
    const res = await createBaseline(
      new NextRequest("http://localhost/api/v1/enforcement/baselines", {
        method: "POST",
        headers: { authorization: "Bearer wf_sk_test", "content-type": "application/json" },
        body: JSON.stringify({
          run_id: "r3",
          workflow_id: "wf-ent",
          projection_hash: "h-ent3",
          projection: { ok: true },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { quota_enforced_via_reserve?: boolean };
    expect(body.quota_enforced_via_reserve).toBe(true);
  });
});

