/**
 * Display helpers for governance account UI — mirrors the trust boundary in docs/governance.md.
 */
export function relianceClassFromRunKind(runKind: string | undefined): "provisional" | "eligible" {
  if (runKind === "quick_preview") return "provisional";
  if (runKind === "contract_sql") return "eligible";
  return "eligible";
}
