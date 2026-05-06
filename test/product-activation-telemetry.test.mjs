/**
 * Phase 9: activation telemetry payload safety guard.
 *
 * Re-asserts the privacy contract for `agentskeptic check`-style activation
 * events from the dist build (requires `npm run build`):
 *
 *   1. AGENTSKEPTIC_TELEMETRY=0 disables outbound POSTs.
 *   2. Built body keys are a strict subset of the documented schema-v3 allowlist.
 *   3. Built body never includes user-payload substrings (registry, certificate,
 *      events ndjson, database url, api key, secret, stack, /tmp, etc.).
 *   4. Telemetry transport failures are swallowed (no throw, no exit-code change
 *      for the caller).
 *   5. terminal_status, when present, is one of complete | inconsistent | incomplete.
 *
 * No live network calls: globalThis.fetch is stubbed.
 * Cross-reference: docs/activation-telemetry-review.md.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ALLOWED_KEYS_STARTED = new Set([
  "event",
  "schema_version",
  "run_id",
  "issued_at",
  "workload_class",
  "workflow_lineage",
  "subcommand",
  "build_profile",
  "telemetry_source",
  "install_id",
  "funnel_anon_id",
  "verification_hypothesis",
]);

const ALLOWED_KEYS_OUTCOME = new Set([
  ...ALLOWED_KEYS_STARTED,
  "terminal_status",
]);

const TERMINAL_STATUS_VALUES = new Set(["complete", "inconsistent", "incomplete"]);

const FORBIDDEN_SUBSTRINGS = [
  "BEGIN CERTIFICATE",
  "OutcomeCertificate",
  "registry",
  "events.ndjson",
  "events_ndjson",
  "DATABASE_URL",
  "TELEMETRY_DATABASE_URL",
  "API_KEY",
  "AGENTSKEPTIC_API_KEY",
  "Authorization",
  "Bearer ",
  "stack at",
  "Error:",
  "/tmp/",
  "C:\\Users\\",
];

function setSandboxHome(home) {
  process.env.HOME = home;
  if (process.platform === "win32") {
    process.env.USERPROFILE = home;
  }
}

function restoreSandboxHome(prevHome, prevUserProfile) {
  if (prevHome !== undefined) process.env.HOME = prevHome;
  else delete process.env.HOME;
  if (process.platform === "win32") {
    if (prevUserProfile !== undefined) process.env.USERPROFILE = prevUserProfile;
    else delete process.env.USERPROFILE;
  }
}

describe("product activation telemetry — first-run safety contract", () => {
  let prevHome;
  let prevUserProfile;
  let prevTelemetry;
  let prevTelemetryOrigin;
  let prevTelemetrySource;
  let prevHypothesis;
  let prevFunnelAnon;
  let prevFetch;
  let homeDir;
  /** @type {{ url: string; init: RequestInit }[]} */
  let fetchCalls;

  beforeEach(async () => {
    fetchCalls = [];
    prevHome = process.env.HOME;
    prevUserProfile = process.env.USERPROFILE;
    prevTelemetry = process.env.AGENTSKEPTIC_TELEMETRY;
    prevTelemetryOrigin = process.env.AGENTSKEPTIC_TELEMETRY_ORIGIN;
    prevTelemetrySource = process.env.AGENTSKEPTIC_TELEMETRY_SOURCE;
    prevHypothesis = process.env.AGENTSKEPTIC_VERIFICATION_HYPOTHESIS;
    prevFunnelAnon = process.env.AGENTSKEPTIC_FUNNEL_ANON_ID;
    prevFetch = globalThis.fetch;

    homeDir = mkdtempSync(join(tmpdir(), "as-phase9-telemetry-"));
    setSandboxHome(homeDir);

    delete process.env.AGENTSKEPTIC_TELEMETRY_ORIGIN;
    delete process.env.AGENTSKEPTIC_TELEMETRY_SOURCE;
    delete process.env.AGENTSKEPTIC_VERIFICATION_HYPOTHESIS;
    delete process.env.AGENTSKEPTIC_FUNNEL_ANON_ID;

    globalThis.fetch = async (url, init) => {
      fetchCalls.push({ url: String(url), init });
      return { ok: true, status: 204 };
    };

    const { resetCliInstallIdModuleStateForTests } = await import(
      "../dist/telemetry/cliInstallId.js"
    );
    resetCliInstallIdModuleStateForTests();
  });

  afterEach(async () => {
    globalThis.fetch = prevFetch;
    restoreSandboxHome(prevHome, prevUserProfile);
    if (prevTelemetry !== undefined) process.env.AGENTSKEPTIC_TELEMETRY = prevTelemetry;
    else delete process.env.AGENTSKEPTIC_TELEMETRY;
    if (prevTelemetryOrigin !== undefined) process.env.AGENTSKEPTIC_TELEMETRY_ORIGIN = prevTelemetryOrigin;
    else delete process.env.AGENTSKEPTIC_TELEMETRY_ORIGIN;
    if (prevTelemetrySource !== undefined) process.env.AGENTSKEPTIC_TELEMETRY_SOURCE = prevTelemetrySource;
    else delete process.env.AGENTSKEPTIC_TELEMETRY_SOURCE;
    if (prevHypothesis !== undefined) process.env.AGENTSKEPTIC_VERIFICATION_HYPOTHESIS = prevHypothesis;
    else delete process.env.AGENTSKEPTIC_VERIFICATION_HYPOTHESIS;
    if (prevFunnelAnon !== undefined) process.env.AGENTSKEPTIC_FUNNEL_ANON_ID = prevFunnelAnon;
    else delete process.env.AGENTSKEPTIC_FUNNEL_ANON_ID;

    const { resetCliInstallIdModuleStateForTests } = await import(
      "../dist/telemetry/cliInstallId.js"
    );
    resetCliInstallIdModuleStateForTests();

    rmSync(homeDir, { recursive: true, force: true });
  });

  it("AGENTSKEPTIC_TELEMETRY=0 disables both verify_started and verify_outcome POSTs", async () => {
    process.env.AGENTSKEPTIC_TELEMETRY = "0";
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    const issued = new Date().toISOString();
    const runId = "run-phase9-disabled";
    await postProductActivationEvent({
      phase: "verify_started",
      run_id: runId,
      issued_at: issued,
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
    });
    await postProductActivationEvent({
      phase: "verify_outcome",
      run_id: runId,
      issued_at: issued,
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
      terminal_status: "complete",
    });
    assert.equal(fetchCalls.length, 0, "no fetch when telemetry forced off");
  });

  it("default (env unset, no persisted opt-in) disables POSTs", async () => {
    delete process.env.AGENTSKEPTIC_TELEMETRY;
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    await postProductActivationEvent({
      phase: "verify_started",
      run_id: "run-phase9-default",
      issued_at: new Date().toISOString(),
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
    });
    assert.equal(fetchCalls.length, 0, "default OSS run is offline");
  });

  it("verify_started body keys are a strict subset of the schema-v3 allowlist", async () => {
    process.env.AGENTSKEPTIC_TELEMETRY = "1";
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    await postProductActivationEvent({
      phase: "verify_started",
      run_id: "run-phase9-allowlist-vs",
      issued_at: new Date().toISOString(),
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
    });
    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(String(fetchCalls[0].init.body));
    assert.equal(body.event, "verify_started");
    assert.equal(body.schema_version, 3);
    for (const key of Object.keys(body)) {
      assert.ok(
        ALLOWED_KEYS_STARTED.has(key),
        `verify_started body included a non-allowlisted key: ${key}`,
      );
    }
    assert.equal(Object.prototype.hasOwnProperty.call(body, "terminal_status"), false);
  });

  it("verify_outcome body keys are a strict subset of the schema-v3 allowlist", async () => {
    process.env.AGENTSKEPTIC_TELEMETRY = "1";
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    const issued = new Date().toISOString();
    await postProductActivationEvent({
      phase: "verify_outcome",
      run_id: "run-phase9-allowlist-vo",
      issued_at: issued,
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
      terminal_status: "complete",
    });
    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(String(fetchCalls[0].init.body));
    assert.equal(body.event, "verify_outcome");
    assert.equal(body.schema_version, 3);
    for (const key of Object.keys(body)) {
      assert.ok(
        ALLOWED_KEYS_OUTCOME.has(key),
        `verify_outcome body included a non-allowlisted key: ${key}`,
      );
    }
  });

  it("body never includes user-payload substrings or secret-shaped values", async () => {
    process.env.AGENTSKEPTIC_TELEMETRY = "1";
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    const issued = new Date().toISOString();
    await postProductActivationEvent({
      phase: "verify_started",
      run_id: "run-phase9-secrets",
      issued_at: issued,
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
    });
    await postProductActivationEvent({
      phase: "verify_outcome",
      run_id: "run-phase9-secrets",
      issued_at: issued,
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
      terminal_status: "incomplete",
    });
    assert.equal(fetchCalls.length, 2);
    for (const call of fetchCalls) {
      const raw = String(call.init.body);
      for (const needle of FORBIDDEN_SUBSTRINGS) {
        assert.equal(
          raw.toLowerCase().includes(needle.toLowerCase()),
          false,
          `body must not include forbidden substring ${JSON.stringify(needle)}`,
        );
      }
      const headers = call.init.headers ?? {};
      for (const headerName of Object.keys(headers)) {
        assert.notEqual(
          headerName.toLowerCase(),
          "authorization",
          "telemetry POST must not send Authorization",
        );
        assert.notEqual(
          headerName.toLowerCase(),
          "cookie",
          "telemetry POST must not send Cookie",
        );
      }
    }
  });

  it("terminal_status on verify_outcome is one of complete | inconsistent | incomplete", async () => {
    process.env.AGENTSKEPTIC_TELEMETRY = "1";
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    const issued = new Date().toISOString();
    for (const ts of /** @type {const} */ (["complete", "inconsistent", "incomplete"])) {
      await postProductActivationEvent({
        phase: "verify_outcome",
        run_id: `run-phase9-ts-${ts}`,
        issued_at: issued,
        workload_class: "non_bundled",
        workflow_lineage: "integrator_scoped",
        subcommand: "batch_verify",
        build_profile: "oss",
        terminal_status: ts,
      });
    }
    assert.equal(fetchCalls.length, 3);
    for (const call of fetchCalls) {
      const body = JSON.parse(String(call.init.body));
      assert.ok(
        TERMINAL_STATUS_VALUES.has(body.terminal_status),
        `terminal_status must be one of ${[...TERMINAL_STATUS_VALUES].join(", ")} but got ${String(body.terminal_status)}`,
      );
    }
  });

  it("telemetry transport failure is swallowed and resolves to undefined", async () => {
    process.env.AGENTSKEPTIC_TELEMETRY = "1";
    globalThis.fetch = async () => {
      throw new Error("simulated network failure");
    };
    const { postProductActivationEvent } = await import(
      "../dist/telemetry/postProductActivationEvent.js"
    );
    const issued = new Date().toISOString();
    const result = await postProductActivationEvent({
      phase: "verify_outcome",
      run_id: "run-phase9-swallow",
      issued_at: issued,
      workload_class: "non_bundled",
      workflow_lineage: "integrator_scoped",
      subcommand: "batch_verify",
      build_profile: "oss",
      terminal_status: "incomplete",
    });
    assert.equal(result, undefined, "transport failure must not throw or return a rejection");
  });
});
