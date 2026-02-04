/**
 * Type definitions for Silk catalog management.
 *
 * @packageDocumentation
 */

/**
 * A catalog is a record mapping package names to semver version ranges.
 *
 * @example
 * ```typescript
 * import type { Catalog } from "@savvy-web/pnpm-plugin-silk";
 *
 * const myCatalog: Catalog = {
 *   typescript: "^5.9.0",
 *   vitest: "^4.0.0",
 * };
 * ```
 *
 * @public
 */
export type Catalog = Record<string, string>;

/**
 * The Silk catalogs structure containing two named catalogs for version management.
 *
 * @remarks
 * Use {@link silkCatalogs} to access the pre-configured catalog instance.
 * The `silk` catalog contains pinned current versions for direct dependencies,
 * while `silkPeers` contains permissive ranges suitable for peerDependencies.
 *
 * @example
 * ```typescript
 * import { silkCatalogs } from "@savvy-web/pnpm-plugin-silk";
 * import type { SilkCatalogs } from "@savvy-web/pnpm-plugin-silk";
 *
 * // Access the pre-configured catalogs
 * const typescriptVersion = silkCatalogs.silk.typescript;
 * const peerRange = silkCatalogs.silkPeers.typescript;
 * ```
 *
 * @public
 */
export interface SilkCatalogs {
	/**
	 * Current/latest versions for direct dependencies.
	 * Use with `catalog:silk` in package.json.
	 */
	readonly silk: Catalog;

	/**
	 * Permissive ranges for peerDependencies.
	 * Use with `catalog:silkPeers` in package.json.
	 */
	readonly silkPeers: Catalog;

	/**
	 * Security overrides for known CVEs.
	 * Synced to pnpm `overrides` configuration.
	 */
	readonly silkOverrides: Catalog;

	/**
	 * Packages allowed to run build scripts during install.
	 * Synced to pnpm `onlyBuiltDependencies` configuration.
	 */
	readonly silkOnlyBuiltDependencies: readonly string[];

	/**
	 * Packages to hoist to the virtual store root.
	 * Synced to pnpm `publicHoistPattern` configuration.
	 */
	readonly silkPublicHoistPattern: readonly string[];
}
