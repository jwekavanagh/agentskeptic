import type { ExecutionTraceNode, ExecutionTraceView, TraceStepKind } from "./types.js";

export type EvaluatedNodeSummary = {
  ingestIndex: number;
  traceStepKind: TraceStepKind;
  engineStepStatus: string | null;
  truthOutcomeLabel: string | null;
  toolId: string | null;
};

export type SeqTraceDiffClass = "only_in_prior" | "only_in_current" | "in_both";

export type SeqTraceDiffRow = {
  seq: number;
  class: SeqTraceDiffClass;
  prior: EvaluatedNodeSummary | null;
  current: EvaluatedNodeSummary | null;
};

function summaryFromNode(n: ExecutionTraceNode): EvaluatedNodeSummary {
  const v = n.verificationLink;
  return {
    ingestIndex: n.ingestIndex,
    traceStepKind: n.traceStepKind,
    engineStepStatus: v ? v.engineStepStatus : null,
    truthOutcomeLabel: v ? v.truthOutcomeLabel : null,
    toolId: n.toolId,
  };
}

/**
 * For each `seq` in `tool_observed` nodes: the node with `verificationLink` if any,
 * else the `tool_observed` line for that `seq` with maximum `ingestIndex`.
 */
function buildSeqToEvaluated(view: ExecutionTraceView): Map<number, EvaluatedNodeSummary> {
  const bySeq = new Map<number, ExecutionTraceNode[]>();
  for (const n of view.nodes) {
    if (n.wireType !== "tool_observed" || n.toolSeq === null) continue;
    const list = bySeq.get(n.toolSeq) ?? [];
    list.push(n);
    bySeq.set(n.toolSeq, list);
  }
  const out = new Map<number, EvaluatedNodeSummary>();
  for (const [seq, nodes] of bySeq) {
    const withLink = nodes.find((x) => x.verificationLink !== null);
    const chosen = withLink ?? nodes.reduce((a, b) => (a.ingestIndex >= b.ingestIndex ? a : b));
    out.set(seq, summaryFromNode(chosen));
  }
  return out;
}

function nonToolCountsForView(view: ExecutionTraceView): Record<string, number> {
  const c: Record<string, number> = {};
  for (const n of view.nodes) {
    if (n.wireType === "tool_observed") continue;
    const k = n.wireType;
    c[k] = (c[k] ?? 0) + 1;
  }
  return c;
}

/** Per plan §4.4: order `seq` by ascending `ingestIndex` of the chosen evaluated node. */
function seqTimelineList(_view: ExecutionTraceView, seqToEval: Map<number, EvaluatedNodeSummary>): number[] {
  const byFirstEvalIngest: Array<{ seq: number; ingest: number }> = [];
  for (const seq of [...seqToEval.keys()].sort((a, b) => a - b)) {
    const ev = seqToEval.get(seq)!;
    byFirstEvalIngest.push({ seq, ingest: ev.ingestIndex });
  }
  byFirstEvalIngest.sort((a, b) => a.ingest - b.ingest);
  return byFirstEvalIngest.map((x) => x.seq);
}

export type TracePairwiseNonToolCounts = {
  prior: Record<string, number>;
  current: Record<string, number>;
};

export function buildTracePairwisePayload(options: {
  priorView: ExecutionTraceView;
  currentView: ExecutionTraceView;
  priorRunIndex: number;
  currentRunIndex: number;
}): {
  priorRunIndex: number;
  currentRunIndex: number;
  viewBuild: { prior: ExecutionTraceView; current: ExecutionTraceView };
  bySeq: SeqTraceDiffRow[];
  seqTimelineOrderDiverged: boolean;
  nonToolEventCounts: TracePairwiseNonToolCounts;
} {
  const { priorView, currentView, priorRunIndex, currentRunIndex } = options;
  const priorM = buildSeqToEvaluated(priorView);
  const currentM = buildSeqToEvaluated(currentView);
  const allSeqs = new Set([...priorM.keys(), ...currentM.keys()]);
  const bySeq: SeqTraceDiffRow[] = [...allSeqs]
    .sort((a, b) => a - b)
    .map((seq) => {
      const p = priorM.get(seq) ?? null;
      const c = currentM.get(seq) ?? null;
      let cl: SeqTraceDiffClass;
      if (p && !c) cl = "only_in_prior";
      else if (!p && c) cl = "only_in_current";
      else cl = "in_both";
      return { seq, class: cl, prior: p, current: c };
    });

  const tPrior = seqTimelineList(priorView, priorM);
  const tCurrent = seqTimelineList(currentView, currentM);
  const seqTimelineOrderDiverged =
    tPrior.length !== tCurrent.length || tPrior.some((s, i) => s !== tCurrent[i]!);

  return {
    priorRunIndex,
    currentRunIndex,
    viewBuild: { prior: priorView, current: currentView },
    bySeq,
    seqTimelineOrderDiverged,
    nonToolEventCounts: {
      prior: nonToolCountsForView(priorView),
      current: nonToolCountsForView(currentView),
    },
  };
}
