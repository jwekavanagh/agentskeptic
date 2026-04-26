import type { PlanDefinition } from "@/lib/plans";
import type { QuotaState } from "@/lib/contracts/usageCurrent";

export type QuotaPolicyInput = {
  usedTotal: number;
  includedMonthly: number | null;
  allowOverage: boolean;
};

export function computeOverageCount(input: QuotaPolicyInput): number {
  const { usedTotal, includedMonthly } = input;
  if (includedMonthly === null) return 0;
  return Math.max(0, usedTotal - includedMonthly);
}

export function computeAllowedNext(input: QuotaPolicyInput): boolean {
  const { usedTotal, includedMonthly, allowOverage } = input;
  if (includedMonthly === null) return true;
  if (allowOverage) return true;
  return usedTotal < includedMonthly;
}

export function computeQuotaState(input: QuotaPolicyInput): QuotaState {
  const { usedTotal, includedMonthly, allowOverage } = input;
  if (includedMonthly === null || includedMonthly <= 0) return "ok";
  const overage = computeOverageCount(input);
  if (overage > 0) return "in_overage";
  if (!allowOverage && usedTotal >= includedMonthly) return "at_cap";
  if (usedTotal >= Math.ceil(0.9 * includedMonthly)) return "warning";
  if (usedTotal >= Math.ceil(0.75 * includedMonthly)) return "notice";
  return "ok";
}

export function estimateOverageUsd(input: {
  overageCount: number;
  overageMicrousdPerVerification: number | null;
}): string {
  const { overageCount, overageMicrousdPerVerification } = input;
  if (!overageMicrousdPerVerification || overageCount <= 0) return "0.00";
  const usd = (overageCount * overageMicrousdPerVerification) / 1_000_000;
  return usd.toFixed(2);
}

export function validatePlanDefinition(def: PlanDefinition | undefined): def is PlanDefinition {
  return Boolean(def);
}

