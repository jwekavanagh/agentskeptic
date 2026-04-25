import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { apiKeys, apiKeysV2 } from "@/db/schema";
import {
  hashApiKey,
  randomHexWithWfSkLivePrefix,
  sha256HexApiKeyLookupFingerprint,
} from "@/lib/apiKeyCrypto";

export const API_KEY_SCOPE_VALUES = [
  "read",
  "meter",
  "report",
  "admin",
] as const;
export type ApiKeyScopeValue = (typeof API_KEY_SCOPE_VALUES)[number];

export type CreateApiKeyInput = {
  label: string;
  scopes: ApiKeyScopeValue[];
  expiresAt: Date | null;
};

export type ApiKeyLifecycleValidationErrorCode =
  | "INVALID_LABEL"
  | "INVALID_SCOPES"
  | "INVALID_EXPIRES_AT";

export class ApiKeyLifecycleValidationError extends Error {
  constructor(
    readonly code: ApiKeyLifecycleValidationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function normalizeLabel(raw: string): string {
  return raw.trim();
}

function isAllowedScope(scope: string): scope is ApiKeyScopeValue {
  return (API_KEY_SCOPE_VALUES as readonly string[]).includes(scope);
}

export function validateApiKeyCreateInput(input: {
  label: string;
  scopes: string[];
  expiresAtRaw?: string | null;
}): CreateApiKeyInput {
  const label = normalizeLabel(input.label);
  if (!label || label.length > 64 || !/^[A-Za-z0-9 _./:-]+$/.test(label)) {
    throw new ApiKeyLifecycleValidationError(
      "INVALID_LABEL",
      "label must match ^[A-Za-z0-9 _./:-]+$ and have length 1..64",
    );
  }

  const scopesRaw = [...new Set(input.scopes.map((s) => s.trim()))].filter(Boolean);
  if (scopesRaw.length === 0 || scopesRaw.length > 4 || !scopesRaw.every(isAllowedScope)) {
    throw new ApiKeyLifecycleValidationError(
      "INVALID_SCOPES",
      "scopes must be a non-empty subset of read,meter,report,admin",
    );
  }

  let expiresAt: Date | null = null;
  if (input.expiresAtRaw != null) {
    const d = new Date(input.expiresAtRaw);
    if (Number.isNaN(d.getTime())) {
      throw new ApiKeyLifecycleValidationError(
        "INVALID_EXPIRES_AT",
        "expires_at must be a valid ISO timestamp",
      );
    }
    if (d.getTime() <= Date.now() + 5 * 60 * 1000) {
      throw new ApiKeyLifecycleValidationError(
        "INVALID_EXPIRES_AT",
        "expires_at must be more than 5 minutes in the future",
      );
    }
    expiresAt = d;
  }

  return { label, scopes: scopesRaw, expiresAt };
}

export async function listApiKeysForUser(userId: string): Promise<
  Array<{
    id: string;
    label: string;
    scopes: ApiKeyScopeValue[];
    status: string;
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    disabledAt: string | null;
    lastUsedAt: string | null;
    source: "v2";
  }>
> {
  const rows = await db
    .select()
    .from(apiKeysV2)
    .where(eq(apiKeysV2.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    scopes: (row.scopes ?? []) as ApiKeyScopeValue[],
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    source: "v2" as const,
  }));
}

export async function createApiKeyForUser(
  userId: string,
  input: CreateApiKeyInput,
): Promise<{ id: string; apiKey: string }> {
  const issuedBearer = randomHexWithWfSkLivePrefix();
  const keyHash = hashApiKey(issuedBearer);
  const keyLookupSha256 = sha256HexApiKeyLookupFingerprint(issuedBearer);

  const created = await db.transaction(async (tx) => {
    const [v2] = await tx
      .insert(apiKeysV2)
      .values({
        userId,
        label: input.label,
        scopes: input.scopes,
        keyHash,
        keyLookupSha256,
        expiresAt: input.expiresAt,
        status: "active",
      })
      .returning({ id: apiKeysV2.id });
    if (!v2) return null;
    // Transitional dual-write while usage tables still reference legacy `api_key`.
    await tx.insert(apiKeys).values({
      id: v2.id,
      userId,
      keyHash,
      keyLookupSha256,
    });
    return v2;
  });
  if (!created) {
    throw new Error("failed to create api_key_v2 row");
  }
  return { id: created.id, apiKey: issuedBearer };
}

export async function revokeApiKeyForUser(
  userId: string,
  keyId: string,
): Promise<{ revoked: boolean }> {
  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(apiKeysV2)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(
        and(
          eq(apiKeysV2.userId, userId),
          eq(apiKeysV2.id, keyId),
          eq(apiKeysV2.status, "active"),
        ),
      )
      .returning({ id: apiKeysV2.id });
    if (rows.length > 0) {
      await tx
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, keyId)));
    }
    return rows;
  });
  return { revoked: updated.length > 0 };
}

export async function rotateApiKeyForUser(
  userId: string,
  keyId: string,
  expiresAtOverride: Date | null,
): Promise<{ id: string; apiKey: string }> {
  const issuedBearer = randomHexWithWfSkLivePrefix();
  const keyHash = hashApiKey(issuedBearer);
  const keyLookupSha256 = sha256HexApiKeyLookupFingerprint(issuedBearer);

  const out = await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(apiKeysV2)
      .where(and(eq(apiKeysV2.id, keyId), eq(apiKeysV2.userId, userId)))
      .for("update");
    const existing = existingRows[0];
    if (!existing || existing.status !== "active") {
      return null;
    }

    const [successor] = await tx
      .insert(apiKeysV2)
      .values({
        userId,
        label: existing.label,
        scopes: (existing.scopes ?? []) as ApiKeyScopeValue[],
        keyHash,
        keyLookupSha256,
        status: "active",
        expiresAt: expiresAtOverride ?? existing.expiresAt ?? null,
        rotatedFromKeyId: existing.id,
      })
      .returning({ id: apiKeysV2.id });
    if (!successor) {
      throw new Error("failed to create rotated successor key");
    }

    await tx.insert(apiKeys).values({
      id: successor.id,
      userId,
      keyHash,
      keyLookupSha256,
    });

    await tx
      .update(apiKeysV2)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        rotatedToKeyId: successor.id,
      })
      .where(and(eq(apiKeysV2.id, existing.id), eq(apiKeysV2.userId, userId)));

    await tx
      .update(apiKeys)
      .set({
        revokedAt: new Date(),
      })
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, existing.id)));

    return successor;
  });

  if (!out) {
    throw new ApiKeyLifecycleValidationError(
      "INVALID_SCOPES",
      "cannot rotate non-active key",
    );
  }
  return { id: out.id, apiKey: issuedBearer };
}
