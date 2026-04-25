import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ApiKeyLifecycleValidationError,
  rotateApiKeyForUser,
  validateApiKeyCreateInput,
} from "@/lib/apiKeyLifecycle";
import { logFunnelEvent } from "@/lib/funnelEvent";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  let body: { expires_at?: string | null };
  try {
    body = (await req.json()) as { expires_at?: string | null };
  } catch {
    body = {};
  }

  try {
    // Reuse expiry validator from create path with minimal no-op values.
    const validated = validateApiKeyCreateInput({
      label: "rotate",
      scopes: ["read"],
      expiresAtRaw: body.expires_at,
    });
    const out = await rotateApiKeyForUser(session.user.id, id, validated.expiresAt);
    await logFunnelEvent({
      event: "api_key_rotated",
      userId: session.user.id,
      metadata: { prior_key_id: id, successor_key_id: out.id },
    });
    return NextResponse.json({ key: { id: out.id, apiKey: out.apiKey } }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiKeyLifecycleValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    throw error;
  }
}
