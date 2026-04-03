import type { ToolObservedEvent } from "./types.js";

/** Deterministic canonical form for params equality (divergence contract). */
export function canonicalJsonForParams(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((el) => canonicalJsonForParams(el)).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as object).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonForParams((value as Record<string, unknown>)[k])}`);
    return `{${parts.join(",")}}`;
  }
  return `__non_json_params:${typeof value}__`;
}

function observationsMatchForDivergence(a: ToolObservedEvent, b: ToolObservedEvent): boolean {
  return a.toolId === b.toolId && canonicalJsonForParams(a.params) === canonicalJsonForParams(b.params);
}

/** Stable sort by seq; ties preserve input order. */
export function stableSortEventsBySeq(events: ToolObservedEvent[]): ToolObservedEvent[] {
  return [...events].sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq;
    return 0;
  });
}

export type LogicalStepPlan = {
  seq: number;
  observations: ToolObservedEvent[];
  last: ToolObservedEvent;
  repeatObservationCount: number;
  divergent: boolean;
};

/**
 * One row per distinct seq, ascending seq order.
 * Last observation in capture order wins when non-divergent.
 */
export function planLogicalSteps(events: ToolObservedEvent[]): LogicalStepPlan[] {
  const sorted = stableSortEventsBySeq(events);
  const bySeq = new Map<number, ToolObservedEvent[]>();
  for (const ev of sorted) {
    const list = bySeq.get(ev.seq);
    if (list) list.push(ev);
    else bySeq.set(ev.seq, [ev]);
  }
  const seqs = [...bySeq.keys()].sort((a, b) => a - b);
  const out: LogicalStepPlan[] = [];
  for (const seq of seqs) {
    const observations = bySeq.get(seq)!;
    const last = observations[observations.length - 1]!;
    let divergent = false;
    if (observations.length >= 2) {
      for (let i = 0; i < observations.length - 1; i++) {
        if (!observationsMatchForDivergence(observations[i]!, last)) {
          divergent = true;
          break;
        }
      }
    }
    out.push({
      seq,
      observations,
      last,
      repeatObservationCount: observations.length,
      divergent,
    });
  }
  return out;
}
