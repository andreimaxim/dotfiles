/**
 * Backward-compatible exports for provider cost computation and rendering.
 *
 * New modules:
 *  - provider-breakdown.ts  (aggregation)
 *  - provider-table.ts      (table rendering)
 */

export type { ProviderRow } from "./provider-breakdown";
export { computeProviderCosts } from "./provider-breakdown";
export { renderProviderTable } from "./provider-table";
