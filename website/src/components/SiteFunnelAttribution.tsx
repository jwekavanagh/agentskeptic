/**
 * Layout now composes `SiteFunnelLayoutParts` so the funnel beacon mounts before `<main>`
 * and the first-five-minutes callout after page content. Re-exports preserve import paths
 * referenced in internal docs.
 */
export { FirstFiveMinutesAfterMain, SiteFunnelBeacon } from "./SiteFunnelLayoutParts";
