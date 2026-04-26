import { z } from "zod";

export const quotaStateSchema = z.enum([
  "ok",
  "notice",
  "warning",
  "in_overage",
  "at_cap",
]);

export const usageCurrentV1Schema = z.object({
  schema_version: z.literal(1),
  plan: z.enum(["starter", "individual", "team", "business", "enterprise"]),
  year_month: z.string().regex(/^\d{4}-\d{2}$/),
  period_start_utc: z.string().datetime(),
  period_end_utc: z.string().datetime(),
  used_total: z.number().int().nonnegative(),
  included_monthly: z.number().int().nonnegative().nullable(),
  allow_overage: z.boolean(),
  overage_count: z.number().int().nonnegative(),
  quota_state: quotaStateSchema,
  allowed_next: z.boolean(),
  estimated_overage_usd: z.string(),
});

export type UsageCurrentV1 = z.infer<typeof usageCurrentV1Schema>;
export type QuotaState = z.infer<typeof quotaStateSchema>;

