import type { ProductActivationRequest } from "@/lib/funnelProductActivation.contract";

export function rowMetadataVerifyStarted(
  body: Extract<ProductActivationRequest, { event: "verify_started" }>,
) {
  const fid = body.funnel_anon_id?.trim();
  return {
    schema_version: 1 as const,
    run_id: body.run_id,
    issued_at: body.issued_at,
    workload_class: body.workload_class,
    subcommand: body.subcommand,
    build_profile: body.build_profile,
    ...(fid ? { funnel_anon_id: fid } : {}),
  };
}

export function rowMetadataVerifyOutcome(
  body: Extract<ProductActivationRequest, { event: "verify_outcome" }>,
) {
  const fid = body.funnel_anon_id?.trim();
  return {
    schema_version: 1 as const,
    run_id: body.run_id,
    issued_at: body.issued_at,
    workload_class: body.workload_class,
    subcommand: body.subcommand,
    build_profile: body.build_profile,
    terminal_status: body.terminal_status,
    ...(fid ? { funnel_anon_id: fid } : {}),
  };
}
