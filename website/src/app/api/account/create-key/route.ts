import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logFunnelEvent } from "@/lib/funnelEvent";
import {
  createApiKeyForUser,
  validateApiKeyCreateInput,
} from "@/lib/apiKeyLifecycle";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const validated = validateApiKeyCreateInput({
    label: "Default key",
    scopes: ["read", "meter", "report", "admin"],
  });
  const created = await createApiKeyForUser(session.user.id, validated);

  await logFunnelEvent({ event: "api_key_created", userId: session.user.id });

  return NextResponse.json({ apiKey: created.apiKey });
}
