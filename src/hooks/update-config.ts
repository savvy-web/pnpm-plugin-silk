/**
 * pnpm updateConfig hook implementation.
 *
 * @remarks
 * Merges Silk catalogs into the pnpm configuration, with local overrides
 * taking precedence while emitting warnings. Uses the CatalogProvider
 * service for dependency-injected catalog data.
 *
 * @see https://pnpm.io/pnpmfile#hooks
 *
 * @packageDocumentation
 * @internal
 */

import { Effect } from "effect";
import { CatalogProvider } from "../services/CatalogProvider.js";
import { PeerDependencyRulesProvider } from "../services/PeerDependencyRulesProvider.js";
import { mergeStringArrays } from "./merge-arrays.js";
import { mergeSingleCatalog } from "./merge-catalogs.js";
import { mergeOverrides } from "./merge-overrides.js";
import { mergePeerDependencyRules } from "./merge-peer-dependency-rules.js";
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
	/** Packages allowed to run build scripts during install. */
	onlyBuiltDependencies?: string[];
	/** Packages to hoist to the virtual store root. */
	publicHoistPattern?: string[];
	/** Rules for handling peer dependency warnings and resolution. */
	peerDependencyRules?: {
		allowedVersions?: Record<string, string>;
		ignoreMissing?: string[];
		allowAny?: string[];
	};
	/** Additional pnpm configuration fields (preserved but not modified). */
	[key: string]: unknown;
}

/**
 * The updateConfig hook for pnpm.
 *
 * @remarks
 * Merges Silk's `silk` and `silkPeers` catalogs into the pnpm configuration.
 * Local catalog entries take precedence, but overrides emit prominent warnings
 * to alert users of version mismatches.
 *
 * Also merges `onlyBuiltDependencies` and `publicHoistPattern` arrays,
 * combining Silk defaults with local entries.
 *
 * @param config - The current pnpm configuration
 * @returns An Effect that resolves to the modified configuration with Silk catalogs merged
 *
 * @internal
 */
export function updateConfig(
	config: PnpmConfig,
): Effect.Effect<PnpmConfig, never, CatalogProvider | PeerDependencyRulesProvider> {
	return Effect.gen(function* () {
		const catalogs = yield* CatalogProvider;
		const peerDepRules = yield* PeerDependencyRulesProvider;

		const warnings: Override[] = [];
		const existingCatalogs = config.catalogs ?? {};

		const mergedSilk = mergeSingleCatalog("silk", catalogs.silk, existingCatalogs.silk, warnings);
		const mergedSilkPeers = mergeSingleCatalog("silkPeers", catalogs.silkPeers, existingCatalogs.silkPeers, warnings);
		const mergedOverrides = mergeOverrides(catalogs.silkOverrides, config.overrides, warnings);
		const mergedOnlyBuiltDependencies = mergeStringArrays(
			catalogs.silkOnlyBuiltDependencies,
			config.onlyBuiltDependencies,
		);
		const mergedPublicHoistPattern = mergeStringArrays(catalogs.silkPublicHoistPattern, config.publicHoistPattern);
		const mergedPeerDependencyRules = mergePeerDependencyRules(peerDepRules, config.peerDependencyRules, warnings);

		warnOverrides(warnings);

		return {
			...config,
			catalogs: {
				...existingCatalogs,
				silk: mergedSilk,
				silkPeers: mergedSilkPeers,
			},
			overrides: mergedOverrides,
			onlyBuiltDependencies: mergedOnlyBuiltDependencies,
			publicHoistPattern: mergedPublicHoistPattern,
			peerDependencyRules: mergedPeerDependencyRules,
		};
	});
}
