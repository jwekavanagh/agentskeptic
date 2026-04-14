import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

let cachedEphemeralInstallId: string | null = null;

function configPath(): string {
  return join(homedir(), ".agentskeptic", "config.json");
}

/** Matches Zod `z.string().uuid()` acceptance for persisted ids. */
function isUuid(s: string): boolean {
  const t = s.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

function tryReadValidInstallIdFromDisk(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  if (raw.trim() === "") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object") return null;
  const id = (parsed as { install_id?: unknown }).install_id;
  if (typeof id !== "string" || !isUuid(id)) return null;
  return id.trim();
}

function tryPersistInstallId(filePath: string, installId: string): boolean {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify({ install_id: installId }), "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Stable pseudonymous id for this CLI environment (best-effort disk, else process singleton).
 * Never throws. Must not be called when telemetry is disabled.
 */
export function getOrCreateInstallId(): string {
  if (cachedEphemeralInstallId) return cachedEphemeralInstallId;

  const path = configPath();
  const fromDisk = tryReadValidInstallIdFromDisk(path);
  if (fromDisk) return fromDisk;

  const newId = randomUUID();
  if (tryPersistInstallId(path, newId)) {
    return newId;
  }

  cachedEphemeralInstallId = newId;
  return newId;
}

/** Clears in-process fallback state (node:test / Vitest only). */
export function resetCliInstallIdModuleStateForTests(): void {
  cachedEphemeralInstallId = null;
}
