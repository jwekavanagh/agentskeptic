import {
  DEBUG_CONSOLE_DEFAULT_TAB,
  parseDebugConsoleUrl,
  resolvedFilters,
  serializeDebugConsoleUrl,
} from "./urlState.js";

const state = {
  nextCursor: null,
  filterParams: new URLSearchParams(),
  selected: new Set(),
  currentTab: DEBUG_CONSOLE_DEFAULT_TAB,
  openRunId: null,
};

function api(path, opts) {
  return fetch(path, opts).then(async (r) => {
    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { _raw: text };
    }
    if (!r.ok) {
      const err = new Error(data?.message || r.statusText);
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  });
}

function buildFilterParamsFromForm() {
  const form = document.getElementById("filters");
  const fd = new FormData(form);
  const p = new URLSearchParams();
  for (const [k, v] of fd.entries()) {
    if (k === "includeLoadErrors" || k === "hasPathFindings") continue;
    if (v !== "" && v != null) {
      p.set(k, String(v));
    }
  }
  const includeLoadErrorsEl = form.querySelector('[name="includeLoadErrors"]');
  if (includeLoadErrorsEl && !includeLoadErrorsEl.checked) {
    p.set("includeLoadErrors", "false");
  }
  const hasPathFindingsEl = form.querySelector('[name="hasPathFindings"]');
  if (hasPathFindingsEl && hasPathFindingsEl.checked) {
    p.set("hasPathFindings", "true");
  }
  return p;
}

/** @param {Record<string, string>} filters */
function applyFiltersToForm(filters) {
  const form = document.getElementById("filters");
  const r = resolvedFilters(filters);
  for (const el of form.querySelectorAll("input[name], select[name]")) {
    const name = el.getAttribute("name");
    if (!name || name === "includeLoadErrors" || name === "hasPathFindings") continue;
    if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
      el.value = r[name] ?? "";
    }
  }
  const inc = form.querySelector('[name="includeLoadErrors"]');
  if (inc instanceof HTMLInputElement) {
    inc.checked = r.includeLoadErrors !== "false";
  }
  const hpf = form.querySelector('[name="hasPathFindings"]');
  if (hpf instanceof HTMLInputElement) {
    hpf.checked = r.hasPathFindings === "true";
  }
}

/** @param {URLSearchParams} p */
function filterObjectFromSearchParams(p) {
  const keys = [
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
  /** @type {Record<string, string>} */
  const out = {};
  for (const k of keys) {
    const v = p.get(k);
    if (v != null && v !== "") {
      out[k] = v;
    }
  }
  if (p.has("includeLoadErrors")) {
    out.includeLoadErrors = p.get("includeLoadErrors") === "true" ? "true" : "false";
  } else {
    out.includeLoadErrors = "true";
  }
  if (p.has("hasPathFindings")) {
    out.hasPathFindings = p.get("hasPathFindings") === "true" ? "true" : "false";
  } else {
    out.hasPathFindings = "false";
  }
  return out;
}

function pushUrl() {
  const filters = filterObjectFromSearchParams(state.filterParams);
  const q = serializeDebugConsoleUrl({
    tab: state.currentTab,
    run: state.openRunId,
    filters,
  });
  const path = window.location.pathname || "/";
  const url = q ? `${path}?${q}` : path;
  history.replaceState(null, "", url);
}

function setActiveTab(tab) {
  const t = tab === "patterns" || tab === "compare" ? tab : DEBUG_CONSOLE_DEFAULT_TAB;
  state.currentTab = t;
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === t);
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === `panel-${t}`);
  });
}

async function loadRuns(append) {
  const p = new URLSearchParams(state.filterParams);
  p.set("limit", "100");
  if (append && state.nextCursor) p.set("cursor", state.nextCursor);
  else state.nextCursor = null;

  const data = await api(`/api/runs?${p.toString()}`);
  const tbody = document.getElementById("runs-body");
  if (!append) {
    tbody.innerHTML = "";
    state.selected.clear();
  }
  document.getElementById("runs-meta").textContent = `totalMatched=${data.totalMatched} showing ${tbody.children.length + data.items.length} (paged)`;
  for (const row of data.items) {
    const tr = document.createElement("tr");
    tr.className = row.loadStatus === "error" ? "load-error" : "load-ok";
    tr.dataset.runId = row.runId;
    const codes = (row.primaryReasonCodes || []).slice(0, 6).join(", ");
    const pathCodes = (row.pathFindingCodes || []).slice(0, 4).join(", ");
    tr.innerHTML = `
      <td><input type="checkbox" class="pick" aria-label="select ${row.runId}" /></td>
      <td><button type="button" class="open-run">${escapeHtml(row.runId)}</button></td>
      <td>${escapeHtml(row.loadStatus)}</td>
      <td>${escapeHtml(row.workflowId || "—")}</td>
      <td>${escapeHtml(row.status || "—")}</td>
      <td>${escapeHtml(row.actionableCategory || "—")}</td>
      <td>${escapeHtml(row.customerId || "—")}</td>
      <td>${escapeHtml(pathCodes || "—")}</td>
      <td>${escapeHtml(codes)}</td>
    `;
    tr.querySelector(".open-run").addEventListener("click", () => openDetail(row.runId));
    tr.querySelector(".pick").addEventListener("change", (ev) => {
      if (ev.target.checked) {
        state.selected.add(row.runId);
        tr.classList.add("selected");
      } else {
        state.selected.delete(row.runId);
        tr.classList.remove("selected");
      }
      document.getElementById("run-compare").disabled = state.selected.size < 2;
    });
    tbody.appendChild(tr);
  }
  state.nextCursor = data.nextCursor;
  document.getElementById("load-more").hidden = !data.nextCursor;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatVerdictSurface(vs) {
  if (!vs || typeof vs !== "object") return "";
  const counts = vs.stepStatusCounts || {};
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}: ${n}`);
  const countsLine = parts.length ? parts.join(" · ") : "(no steps)";
  return `
      <div class="verdict-panel" role="region" aria-label="Workflow verdict">
        <div class="verdict-status">Workflow status: <code>${escapeHtml(vs.status)}</code></div>
        <div class="verdict-trust">${escapeHtml(vs.trustSummary || "")}</div>
        <div class="verdict-counts">Step outcomes: ${escapeHtml(countsLine)}</div>
      </div>`;
}

function focusButtonLabel(t) {
  const v = String(t.value);
  const short = t.rationale && t.rationale.length > 72 ? `${t.rationale.slice(0, 69)}…` : t.rationale || `${t.kind}: ${v}`;
  return `${t.kind}: ${v} — ${short}`;
}

/**
 * @param {HTMLElement} body
 * @param {string} kind
 * @param {string} value
 */
function scrollToFocusTarget(body, kind, value) {
  for (const el of body.querySelectorAll(".trace-step")) {
    if (kind === "seq" && el.getAttribute("data-seq") === value) {
      pulseEl(el);
      return;
    }
    if (kind === "ingestIndex" && el.getAttribute("data-ingest-index") === value) {
      pulseEl(el);
      return;
    }
    if (kind === "runEventId" && el.getAttribute("data-run-event-id") === value) {
      pulseEl(el);
      return;
    }
  }
}

/** @param {HTMLElement} el */
function pulseEl(el) {
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  el.classList.add("pulse-focus");
  window.setTimeout(() => {
    el.classList.remove("pulse-focus");
  }, 900);
}

/** @param {HTMLElement} body */
function wireFocusButtons(body) {
  body.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest && ev.target.closest(".focus-target-btn");
    if (!btn || !(btn instanceof HTMLElement)) return;
    const kind = btn.dataset.kind;
    const value = btn.dataset.value;
    if (!kind || value == null) return;
    scrollToFocusTarget(body, kind, value);
  });
}

async function openDetail(runId) {
  const drawer = document.getElementById("detail-drawer");
  const body = document.getElementById("detail-body");
  const title = document.getElementById("detail-title");
  drawer.classList.remove("hidden");
  state.openRunId = runId;
  pushUrl();
  title.textContent = `Run: ${runId}`;
  body.innerHTML = "<p>Loading…</p>";
  try {
    const data = await api(`/api/runs/${encodeURIComponent(runId)}`);
    if (data.loadStatus === "error") {
      state.openRunId = runId;
      pushUrl();
      body.innerHTML = `
        <p class="focus-panel"><strong>Load error</strong> <code>${escapeHtml(data.error.code)}</code></p>
        <pre class="json-out">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
      `;
      return;
    }
    let focusHtml = "";
    const focusSet = new Set();
    /** @type {{ targets: { kind: string; value: string | number; rationale: string }[] }} */
    let focusPayload = { targets: [] };
    try {
      const focus = await api(`/api/runs/${encodeURIComponent(runId)}/focus`);
      focusPayload = focus;
      const buttons =
        focus.targets && focus.targets.length
          ? focus.targets
              .map((t) => {
                const v = String(t.value);
                const label = escapeHtml(focusButtonLabel(t));
                return `<button type="button" class="focus-target-btn" data-kind="${escapeHtml(t.kind)}" data-value="${escapeHtml(v)}" title="${escapeHtml(t.rationale)}">${label}</button>`;
              })
              .join("")
          : "";
      focusHtml =
        focus.targets && focus.targets.length
          ? `<div class="focus-panel" role="region" aria-label="Focus targets"><strong>Focus targets</strong><p class="meta">Click a target to scroll to the matching trace step.</p><div class="focus-target-list">${buttons}</div></div>`
          : "";
      for (const t of focus.targets || []) {
        if (t.kind === "seq") focusSet.add(`seq:${t.value}`);
        if (t.kind === "ingestIndex") focusSet.add(`ingest:${t.value}`);
        if (t.kind === "runEventId") focusSet.add(`runEventId:${t.value}`);
      }
    } catch (e) {
      focusHtml = `<p class="meta">Focus: ${escapeHtml(e.message)}</p>`;
    }
    const verdictHtml = formatVerdictSurface(data.workflowVerdictSurface);
    const steps = (data.executionTrace?.nodes || []).map((n, i) => {
      const seq = n.toolSeq ?? n.verificationLink?.seq;
      const seqKey = seq != null ? `seq:${seq}` : "";
      const ingestKey = `ingest:${n.ingestIndex}`;
      const runEvKey = n.runEventId ? `runEventId:${n.runEventId}` : "";
      const hit =
        (seqKey && focusSet.has(seqKey)) ||
        focusSet.has(ingestKey) ||
        (runEvKey && focusSet.has(runEvKey));
      const seqAttr = seq != null ? ` data-seq="${escapeHtml(String(seq))}"` : "";
      const ingestAttr = ` data-ingest-index="${escapeHtml(String(n.ingestIndex ?? ""))}"`;
      const rev =
        n.runEventId != null && n.runEventId !== ""
          ? ` data-run-event-id="${escapeHtml(String(n.runEventId))}"`
          : "";
      return `<div class="trace-step ${hit ? "focus-hit" : ""}" data-idx="${i}"${seqAttr}${ingestAttr}${rev}>${escapeHtml(JSON.stringify(n))}</div>`;
    });
    const trustHtml =
      typeof data.runTrustPanelHtml === "string"
        ? `<div class="run-trust-panel">${data.runTrustPanelHtml}</div>`
        : "";
    body.innerHTML = `
      ${trustHtml}
      ${verdictHtml}
      ${focusHtml}
      <h3>Trace nodes</h3>
      ${steps.join("") || "<p>(no trace nodes)</p>"}
      <h3>WorkflowResult</h3>
      <pre class="json-out">${escapeHtml(JSON.stringify(data.workflowResult, null, 2))}</pre>
    `;
    if (focusPayload.targets && focusPayload.targets.length) {
      wireFocusButtons(body);
    }
    pushUrl();
  } catch (e) {
    body.innerHTML = `<p class="focus-panel">Error: ${escapeHtml(e.message)}</p>`;
  }
}

function closeDetail() {
  document.getElementById("detail-drawer").classList.add("hidden");
  state.openRunId = null;
  pushUrl();
}

document.getElementById("filters").addEventListener("submit", (ev) => {
  ev.preventDefault();
  state.filterParams = buildFilterParamsFromForm();
  pushUrl();
  loadRuns(false).catch((e) => alert(e.message));
});

document.getElementById("clear-filters").addEventListener("click", () => {
  document.getElementById("filters").reset();
  document.querySelector('[name="includeLoadErrors"]').checked = true;
  state.filterParams = buildFilterParamsFromForm();
  pushUrl();
  loadRuns(false).catch((e) => alert(e.message));
});

document.getElementById("load-more").addEventListener("click", () => {
  loadRuns(true).catch((e) => alert(e.message));
});

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveTab(btn.dataset.tab || DEBUG_CONSOLE_DEFAULT_TAB);
    pushUrl();
  });
});

document.getElementById("refresh-patterns").addEventListener("click", async () => {
  const out = document.getElementById("patterns-out");
  out.textContent = "Loading…";
  const p = new URLSearchParams(state.filterParams);
  try {
    const data = await api(`/api/corpus-patterns?${p.toString()}`);
    out.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    out.textContent = JSON.stringify(e.data || { message: e.message }, null, 2);
  }
});

document.getElementById("run-compare").addEventListener("click", async () => {
  const ids = [...state.selected];
  const out = document.getElementById("compare-out");
  out.textContent = "Loading…";
  try {
    const data = await api("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runIds: ids }),
    });
    if (typeof data.comparePanelHtml === "string") {
      out.innerHTML = data.comparePanelHtml;
    } else {
      out.textContent = "comparePanelHtml missing in response.";
    }
  } catch (e) {
    out.textContent = "";
    out.appendChild(document.createTextNode(JSON.stringify(e.data || { message: e.message }, null, 2)));
  }
});

document.getElementById("close-detail").addEventListener("click", () => {
  closeDetail();
});

window.addEventListener("popstate", () => {
  void applyUrlToUi();
});

async function applyUrlToUi() {
  const parsed = parseDebugConsoleUrl(new URLSearchParams(window.location.search));
  applyFiltersToForm(parsed.filters);
  state.filterParams = buildFilterParamsFromForm();
  setActiveTab(parsed.tab);
  try {
    await loadRuns(false);
  } catch (e) {
    document.getElementById("runs-meta").textContent = `Failed to load: ${e.message}`;
    return;
  }
  if (parsed.run) {
    await openDetail(parsed.run);
  } else {
    closeDetail();
  }
}

void applyUrlToUi().catch((e) => {
  document.getElementById("runs-meta").textContent = `Failed to load: ${e.message}`;
});
