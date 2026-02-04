/**
 * pnpm updateConfig hook implementation.
 *
 * @remarks
 * Merges Silk catalogs into the pnpm configuration, with local overrides
 * taking precedence while emitting warnings.
 *
 * @see https://pnpm.io/pnpmfile#hooks
 *
 * @packageDocumentation
 * @internal
 */

import { silkCatalogs } from "../catalogs/generated.js";
import type { Catalog } from "../catalogs/types.js";
import type { Override } from "./warnings.js";
import { warnOverrides } from "./warnings.js";

/**
 * Minimal pnpm config type for the fields we interact with.
 *
 * @remarks
 * This interface only declares the fields the plugin reads and writes.
 * pnpm may pass additional fields which are preserved via the index signature.
 *
 * @internal
 */
export interface PnpmConfig {
	/** Named catalogs mapping package names to version ranges. */
	catalogs?: Record<string, Record<string, string>>;
	/** Package version overrides for security fixes. */
	overrides?: Record<string, string>;
	/** Additional pnpm configuration fields (preserved but not modified). */
	[key: string]: unknown;
}

/**
 * Merge a single catalog, tracking overrides.
 *
 * @param catalogName - The name of the catalog (e.g., "silk")
 * @param silkCatalog - The Silk-provided catalog entries
 * @param localCatalog - The local catalog entries (may be undefined)
 * @param overrides - Array to collect override information
 * @returns The merged catalog with local entries taking precedence
 */
function mergeSingleCatalog(
	catalogName: string,
	silkCatalog: Catalog,
	localCatalog: Catalog | undefined,
	overrides: Override[],
): Catalog {
	const merged: Catalog = { ...silkCatalog };

	if (!localCatalog) {
		return merged;
	}

	for (const [pkg, localVersion] of Object.entries(localCatalog)) {
		const silkVersion = silkCatalog[pkg];

		if (silkVersion !== undefined && silkVersion !== localVersion) {
			overrides.push({
				catalog: catalogName,
				package: pkg,
				silkVersion,
				localVersion,
			});
		}

		merged[pkg] = localVersion;
	}

	return merged;
}

/**
 * Merge overrides, tracking divergences.
 *
 * @param silkOverrides - The Silk-provided overrides
 * @param localOverrides - The local overrides (may be undefined)
 * @param overrideWarnings - Array to collect override information
 * @returns The merged overrides with local entries taking precedence
 */
function mergeOverrides(
	silkOverrides: Catalog,
	localOverrides: Catalog | undefined,
	overrideWarnings: Override[],
): Catalog {
	const merged: Catalog = { ...silkOverrides };

	if (!localOverrides) {
		return merged;
	}

	for (const [pkg, localVersion] of Object.entries(localOverrides)) {
		const silkVersion = silkOverrides[pkg];

		if (silkVersion !== undefined && silkVersion !== localVersion) {
			overrideWarnings.push({
				catalog: "overrides",
				package: pkg,
				silkVersion,
				localVersion,
			});
		}

		merged[pkg] = localVersion;
	}

	return merged;
}

/**
 * The updateConfig hook for pnpm.
 *
 * @remarks
 * Merges Silk's `silk` and `silkPeers` catalogs into the pnpm configuration.
 * Local catalog entries take precedence, but overrides emit prominent warnings
 * to alert users of version mismatches.
 *
 * On error, logs a warning and returns the original config unchanged to avoid
 * breaking the installation process.
 *
 * @param config - The current pnpm configuration
 * @returns The modified configuration with Silk catalogs merged
 *
 * @internal
 */
export function updateConfig(config: PnpmConfig): PnpmConfig {
	try {
		const warnings: Override[] = [];
		const existingCatalogs = config.catalogs ?? {};

		const mergedSilk = mergeSingleCatalog("silk", silkCatalogs.silk, existingCatalogs.silk, warnings);
		const mergedSilkPeers = mergeSingleCatalog(
			"silkPeers",
			silkCatalogs.silkPeers,
			existingCatalogs.silkPeers,
			warnings,
		);
		const mergedOverrides = mergeOverrides(silkCatalogs.silkOverrides, config.overrides, warnings);

		warnOverrides(warnings);

		return {
			...config,
			catalogs: {
				...existingCatalogs,
				silk: mergedSilk,
				silkPeers: mergedSilkPeers,
			},
			overrides: mergedOverrides,
		};
	} catch (error) {
		console.warn(
			"[pnpm-plugin-silk] Error merging catalogs, using local config only:",
			error instanceof Error ? error.message : String(error),
		);
		return config;
	}
}
