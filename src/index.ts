/**
 * pnpm-plugin-silk - Centralized catalog management for the Silk ecosystem.
 *
 * @remarks
 * This package provides curated dependency versions via pnpm config dependencies.
 * Use `catalog:silk` for pinned current versions and `catalog:silkPeers` for
 * permissive peer dependency ranges that automatically merge into consuming repositories.
 *
 * @example
 * ```typescript
 * import { silkCatalogs } from "@savvy-web/pnpm-plugin-silk";
 * import type { Catalog, SilkCatalogs } from "@savvy-web/pnpm-plugin-silk";
 *
 * // Access current versions for direct dependencies
 * console.log(silkCatalogs.silk.typescript); // "^5.9.3"
 *
 * // Access permissive ranges for peer dependencies
 * console.log(silkCatalogs.silkPeers.typescript); // "^5.9.3"
 * ```
 *
 * @see {@link silkCatalogs} for the pre-configured catalog instance
 * @see {@link SilkCatalogs} for the catalog interface
 *
 * @packageDocumentation
 */

export type { Catalog, SilkCatalogs } from "./catalogs/index.js";
export { silkCatalogs } from "./catalogs/index.js";
