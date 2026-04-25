import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ApiKeyLifecycleValidationError,
  createApiKeyForUser,
  listApiKeysForUser,
  validateApiKeyCreateInput,
} from "@/lib/apiKeyLifecycle";
import { logFunnelEvent } from "@/lib/funnelEvent";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = await listApiKeysForUser(session.user.id);
  return NextResponse.json({ keys });
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { label?: string; scopes?: string[]; expires_at?: string | null };
  try {
    body = (await req.json()) as { label?: string; scopes?: string[]; expires_at?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const validated = validateApiKeyCreateInput({
      label: body.label ?? "",
      scopes: Array.isArray(body.scopes) ? body.scopes : [],
      expiresAtRaw: body.expires_at,
    });
    const created = await createApiKeyForUser(session.user.id, validated);
    await logFunnelEvent({
      event: "api_key_created",
      userId: session.user.id,
      metadata: { key_id: created.id, scopes: validated.scopes },
    });
    return NextResponse.json(
      {
        key: {
          id: created.id,
          apiKey: created.apiKey,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiKeyLifecycleValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    throw error;
  }
}
