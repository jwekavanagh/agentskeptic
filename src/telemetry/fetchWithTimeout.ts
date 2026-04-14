/**
 * Bounded fetch; clears the timer in `finally` so process exit does not trip libuv
 * assertions on Windows when using short-lived CLI processes.
 */
export async function fetchWithTimeout(
  url: string,
  init: Omit<RequestInit, "signal">,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}
