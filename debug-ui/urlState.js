/** @typedef {{ tab: string, run: string | null, filters: Record<string, string> }} DebugConsoleUrlState */

export const DEBUG_CONSOLE_DEFAULT_TAB = "runs";

const VALID_TABS = new Set(["runs", "patterns", "compare"]);

const FILTER_TEXT_KEYS = [
  "loadStatus",
  "workflowId",
  "status",
  "failureCategory",
  "reasonCode",
  "toolId",
  "customerId",
  "timeFrom",
  "timeTo",
];

/**
 * @param {URLSearchParams} searchParams
 * @returns {DebugConsoleUrlState}
 */
export function parseDebugConsoleUrl(searchParams) {
  const rawTab = searchParams.get("tab") || DEBUG_CONSOLE_DEFAULT_TAB;
  const tab = VALID_TABS.has(rawTab) ? rawTab : DEBUG_CONSOLE_DEFAULT_TAB;
  const runRaw = searchParams.get("run");
  const run = runRaw != null && runRaw !== "" ? runRaw : null;

  /** @type {Record<string, string>} */
  const filters = {};
  for (const k of FILTER_TEXT_KEYS) {
    const v = searchParams.get(k);
    if (v != null && v !== "") {
      filters[k] = v;
    }
  }

  if (searchParams.has("includeLoadErrors")) {
    filters.includeLoadErrors = searchParams.get("includeLoadErrors") === "true" ? "true" : "false";
  }
  if (searchParams.has("hasPathFindings")) {
    filters.hasPathFindings = searchParams.get("hasPathFindings") === "true" ? "true" : "false";
  }

  return { tab, run, filters };
}

/**
 * Default filter semantics aligned with debug-ui/app.js (includeLoadErrors checked by default).
 * @returns {Record<string, string>}
 */
export function defaultFilterRecord() {
  return { includeLoadErrors: "true" };
}

/**
 * Merge URL-derived filters with defaults for form population.
 * @param {Record<string, string>} filters
 */
export function resolvedFilters(filters) {
  const out = { ...defaultFilterRecord(), ...filters };
  if (!("hasPathFindings" in out)) {
    out.hasPathFindings = "false";
  }
  return out;
}

/**
 * @param {DebugConsoleUrlState} state
 * @returns {string} query string without leading "?"
 */
export function serializeDebugConsoleUrl(state) {
  const p = new URLSearchParams();
  p.set("tab", state.tab || DEBUG_CONSOLE_DEFAULT_TAB);
  if (state.run) {
    p.set("run", state.run);
  }
  const f = state.filters || {};
  for (const k of FILTER_TEXT_KEYS) {
    const v = f[k];
    if (v != null && v !== "") {
      p.set(k, String(v));
    }
  }
  if (f.includeLoadErrors === "false") {
    p.set("includeLoadErrors", "false");
  }
  if (f.hasPathFindings === "true") {
    p.set("hasPathFindings", "true");
  }
  return p.toString();
}
