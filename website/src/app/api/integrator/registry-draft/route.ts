import { NextRequest, NextResponse } from "next/server";
import { parseBootstrapPackInputJson, synthesizeQuickInputUtf8FromOpenAiV1 } from "agentskeptic/bootstrapPackSynthesis";
import {
  buildRegistryDraftPrompt,
  getBootstrapPackInputValidator,
  getRegistryDraftRequestValidator,
  getRegistryDraftResponseEnvelopeValidator,
  parseAndNormalizeRegistryDraftRequest,
} from "agentskeptic/registryDraft";
import { db } from "@/db/client";
import { isFunnelSurfaceRequestOriginAllowed } from "@/lib/funnelRequestOriginAllowed";
import { callOpenAiRegistryDraftJson } from "@/lib/registryDraft/callOpenAiRegistryDraft";
import { extractClientIpKey } from "@/lib/magicLinkSendGate";
import { reserveRegistryDraftIpSlot, withSerializableRetry } from "@/lib/ossClaimRateLimits";

export const runtime = "nodejs";

const REGISTRY_DRAFT_MAX_BODY_BYTES = 65536;

function registryDraftFeatureActive(): boolean {
  return process.env.REGISTRY_DRAFT_ENABLED === "1" && Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!registryDraftFeatureActive()) {
    return new NextResponse(null, { status: 404 });
  }

  if (!isFunnelSurfaceRequestOriginAllowed(req)) {
    return NextResponse.json({ code: "FUNNEL_ORIGIN_FORBIDDEN" }, { status: 403 });
  }

  const rawCt = req.headers.get("content-type");
  const ct = rawCt?.toLowerCase() ?? "";
  if (!ct.startsWith("application/json")) {
    return new NextResponse(null, { status: 400 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > REGISTRY_DRAFT_MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (Buffer.byteLength(rawText, "utf8") > REGISTRY_DRAFT_MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(rawText) as unknown;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const validateRequest = getRegistryDraftRequestValidator();
  const validateBootstrap = getBootstrapPackInputValidator();
  const parsed = parseAndNormalizeRegistryDraftRequest(jsonBody, validateRequest, validateBootstrap);
  if (!parsed.ok) {
    return NextResponse.json({ code: "INVALID_REQUEST", errors: parsed.errors }, { status: 400 });
  }

  const ipKey = extractClientIpKey(req);
  const rate = await withSerializableRetry(async () =>
    db.transaction(async (tx) => reserveRegistryDraftIpSlot(tx, ipKey)),
  );
  if (!rate.ok) {
    return new NextResponse(null, { status: 429 });
  }

  const prompt = buildRegistryDraftPrompt(parsed.normalizedBootstrapPackInput, parsed.ddlHint);
  const model = process.env.REGISTRY_DRAFT_MODEL?.trim() || "gpt-4o-mini";

  const ai = await callOpenAiRegistryDraftJson({ prompt, model });
  if (!ai.ok) {
    return NextResponse.json({ code: "OPENAI_ERROR", message: ai.message }, { status: ai.status });
  }

  let llmPartial: unknown;
  try {
    llmPartial = JSON.parse(ai.contentText) as unknown;
  } catch {
    return NextResponse.json({ code: "MODEL_OUTPUT_INVALID", message: "model returned non-JSON" }, { status: 502 });
  }

  if (llmPartial === null || typeof llmPartial !== "object" || Array.isArray(llmPartial)) {
    return NextResponse.json(
      { code: "MODEL_OUTPUT_INVALID", message: "model output must be a JSON object" },
      { status: 502 },
    );
  }
  const lp = llmPartial as Record<string, unknown>;

  let bodyUtf8: string;
  try {
    const rawBootstrap = JSON.stringify(parsed.normalizedBootstrapPackInput);
    const pbi = parseBootstrapPackInputJson(rawBootstrap);
    bodyUtf8 = synthesizeQuickInputUtf8FromOpenAiV1(pbi);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ code: "QUICK_INGEST_SYNTHESIS_FAILED", message: msg }, { status: 500 });
  }

  const merged = {
    schemaVersion: 2,
    draft: lp["draft"],
    assumptions: lp["assumptions"],
    warnings: lp["warnings"],
    disclaimer: lp["disclaimer"],
    model: lp["model"],
    quickIngestInput: { encoding: "utf8" as const, body: bodyUtf8 },
  };

  const validateResponse = getRegistryDraftResponseEnvelopeValidator();
  if (!validateResponse(merged)) {
    return NextResponse.json(
      { code: "MODEL_OUTPUT_INVALID", errors: validateResponse.errors ?? [] },
      { status: 502 },
    );
  }

  return NextResponse.json(merged, { status: 200 });
}
