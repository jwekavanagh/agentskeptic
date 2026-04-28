import type { AgentSkeptic } from "../AgentSkeptic.js";
import type { DecisionGate } from "../../decisionGate.js";

export type CreateNextRouteHandlerOptions = {
  /** When the request has no `workflowId` in JSON body, use this gate id. */
  defaultWorkflowId?: string;
  /** When true, enforce run-event integrity before handler response is returned. */
  strictEmissionQuality?: boolean;
};

/**
 * Next.js App Router helper: returns a `POST` handler that creates a `DecisionGate` per request.
 * For JSON bodies, reads optional `workflowId` from the parsed object; otherwise uses `defaultWorkflowId` (default `api`).
 */
export function createNextRouteHandler<T>(
  skeptic: AgentSkeptic,
  handler: (gate: DecisionGate, req: Request) => Promise<T>,
  options?: CreateNextRouteHandlerOptions,
): (req: Request) => Promise<Response> {
  const fallbackId = options?.defaultWorkflowId ?? "api";
  const strictEmissionQuality = options?.strictEmissionQuality ?? false;
  return async (req: Request) => {
    let workflowId = fallbackId;
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const body: unknown = await req.clone().json();
        if (
          body &&
          typeof body === "object" &&
          "workflowId" in body &&
          typeof (body as { workflowId?: unknown }).workflowId === "string"
        ) {
          workflowId = (body as { workflowId: string }).workflowId;
        }
      } catch {
        /* use fallback */
      }
    }
    const gate = skeptic.gate({ workflowId });
    const out = await handler(gate, req);
    if (strictEmissionQuality) {
      gate.assertEmissionQuality();
    }
    return Response.json(out as object);
  };
}
