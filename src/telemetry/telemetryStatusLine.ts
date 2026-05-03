import { LICENSE_PREFLIGHT_ENABLED } from "../generated/commercialBuildFlags.js";
import { isProductActivationTelemetryEnabled } from "./telemetryConsent.js";

let printed = false;

/** Vitest / node:test: allow repeated CLI runs in one process. */
export function resetTelemetryStatusLineForTests(): void {
  printed = false;
}

/**
 * OSS build: print once whether product-activation telemetry is enabled (stderr).
 * Does not claim all network is disabled (witnesses, share-report, licensing may still apply).
 */
export function printProductActivationTelemetryStatusLineOnce(): void {
  if (printed) return;
  if (LICENSE_PREFLIGHT_ENABLED) return;
  printed = true;
  if (isProductActivationTelemetryEnabled()) {
    process.stderr.write("Telemetry enabled: sending anonymous usage events.\n");
  } else {
    process.stderr.write("Running offline: telemetry disabled.\n");
  }
}
