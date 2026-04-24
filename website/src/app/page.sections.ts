/** Ordered homepage section ids — validated in Vitest (conversion funnel order). */
export const HOME_SECTION_ORDER = [
  "hero",
  "homeFailureExample",
  "tryIt",
  "homeWhatCatches",
  "homeStakes",
  "howItWorks",
  "homeWhoFor",
  "homeGuarantees",
  "homeClosing",
  "commercialSurface",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_ORDER)[number];
