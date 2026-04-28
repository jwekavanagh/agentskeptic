import { AgentSkeptic, BufferSink } from "agentskeptic";
import { createNextRouteHandler } from "agentskeptic/next";
import { join } from "node:path";

const skeptic = new AgentSkeptic({
  registryPath: join(process.cwd(), "agentskeptic", "tools.json"),
  databaseUrl: process.env.DATABASE_URL ?? "",
});

export const POST = createNextRouteHandler(skeptic, async (gate, req) => {
  const body = (await req.json()) as {
    workflowId?: string;
    observations?: Array<{ toolId: string; params: Record<string, unknown> }>;
  };
  const sink = new BufferSink();
  const emitter = skeptic.createEmitter({
    workflowId: body.workflowId ?? "api",
    sink,
    defaultToolObservedSchemaVersion: 2,
  });
  for (const obs of body.observations ?? []) {
    await emitter.emitToolObserved({ toolId: obs.toolId, params: obs.params });
  }
  await emitter.finalizeRun();
  for (const ev of sink.snapshot()) gate.appendRunEvent(ev);
  gate.assertEmissionQuality();
  return await gate.evaluateCertificate();
}, { strictEmissionQuality: true });
