import { stringifyWithSortedKeys } from "../sortedJsonStringify.js";

/** UTF-8 bytes of sorted-keys canonical JSON; no trailing newline. */
export function fingerprintUtf8JsonFileBytes(obj: unknown): Buffer {
  return Buffer.from(stringifyWithSortedKeys(obj), "utf8");
}

/** UTF-8 bytes of sorted-keys canonical JSON followed by a single LF. */
export function lineUtf8JsonFileBytes(obj: unknown): Buffer {
  return Buffer.from(`${stringifyWithSortedKeys(obj)}\n`, "utf8");
}
