#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { ARTIFACTS_DIR, ROOT, readJson } from "./lib.mjs";

const schema = readJson(path.join(ROOT, "schemas", "conformance-normalized-result.schema.json"));
const requiredTop = new Set(schema.required ?? []);
const requiredOutcome = new Set(schema.properties?.outcome?.required ?? []);

for (const runtime of ["typescript", "python"]) {
  const file = path.join(ARTIFACTS_DIR, "conformance", runtime, "all.json");
  const payload = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(payload.results)) throw new Error(`${runtime}: missing results[]`);
  for (const result of payload.results) {
    for (const key of requiredTop) {
      if (!(key in result)) throw new Error(`${runtime}: invalid result for ${result.scenarioId}: missing ${key}`);
    }
    const outcome = result.outcome;
    if (!outcome || typeof outcome !== "object") {
      throw new Error(`${runtime}: invalid result for ${result.scenarioId}: outcome missing/object`);
    }
    for (const key of requiredOutcome) {
      if (!(key in outcome)) throw new Error(`${runtime}: invalid result for ${result.scenarioId}: outcome.${key} missing`);
    }
    if (!Array.isArray(outcome.reasonCodes)) {
      throw new Error(`${runtime}: invalid result for ${result.scenarioId}: outcome.reasonCodes must be array`);
    }
    if (typeof result.normalizedHash !== "string" || !/^[a-f0-9]{64}$/.test(result.normalizedHash)) {
      throw new Error(`${runtime}: invalid result for ${result.scenarioId}: normalizedHash format`);
    }
  }
}

console.log("conformance artifacts: schema valid");

