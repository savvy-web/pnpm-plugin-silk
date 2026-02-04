/**
 * Silk catalog definitions.
 *
 * @remarks
 * Re-exports the generated catalogs from pnpm-workspace.yaml.
 * Run `pnpm run generate:catalogs` to regenerate after updating versions.
 *
 * @see {@link silkCatalogs} for the pre-configured catalog instance
 * @see {@link SilkCatalogs} for the catalog interface
 *
 * @packageDocumentation
 */

export { silkCatalogs } from "./generated.js";
export type { Catalog, SilkCatalogs } from "./types.js";
