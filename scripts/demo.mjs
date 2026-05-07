#!/usr/bin/env node
import { prepareBundledDemoDb, runBundledTruthCheck } from "./lib/bundledDemoCheck.mjs";

prepareBundledDemoDb();

let st = runBundledTruthCheck("wf_complete").status ?? 1;
let err = null;
if (st !== 0) err = `demo: wf_complete expected exit 0, got ${st}`;
else {
  st = runBundledTruthCheck("wf_missing").status ?? 1;
  if (st !== 1) err = `demo: wf_missing expected exit 1, got ${st}`;
}
if (err) {
  console.error(err);
  process.exit(1);
}
process.exit(0);
