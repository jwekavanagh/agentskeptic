import { z } from "zod";

export const funnelSurfaceImpressionSchema = z
  .object({
    surface: z.enum(["acquisition", "integrate"]),
    funnel_anon_id: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().uuid().optional(),
    ),
    attribution: z.record(z.unknown()).optional(),
  })
  .strict();

export type FunnelSurfaceImpressionBody = z.infer<typeof funnelSurfaceImpressionSchema>;
