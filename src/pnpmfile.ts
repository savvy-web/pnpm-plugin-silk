/**
 * pnpmfile.mjs entry point for @savvy-web/pnpm-plugin-silk.
 *
 * @remarks
 * This file is bundled to a single self-contained ESM `pnpmfile.mjs` and loaded
 * by pnpm 11 as a config dependency. It exports the `hooks` object that pnpm
 * calls during installation.
 *
 * @see https://pnpm.io/pnpmfile
 * @see https://pnpm.io/config-dependencies
 *
 * @packageDocumentation
 * @internal
 */

import { Effect, Layer } from "effect";
import { updateConfig } from "./hooks/update-config.js";
import { CatalogProvider } from "./services/CatalogProvider.js";
import { PeerDependencyRulesProvider } from "./services/PeerDependencyRulesProvider.js";

const LiveLayer = Layer.merge(CatalogProvider.Live, PeerDependencyRulesProvider.Live);

/**
 * pnpm hooks object exported for the pnpmfile entry point.
 *
 * @see https://pnpm.io/pnpmfile#hooks
 *
 * @internal
 */
export const hooks = {
	updateConfig(config: Record<string, unknown>) {
		try {
			return Effect.runSync(updateConfig(config).pipe(Effect.provide(LiveLayer)));
		} catch (error) {
			console.warn(
				"[pnpm-plugin-silk] Error merging catalogs, using local config only:",
				error instanceof Error ? error.message : String(error),
			);
			return config;
		}
	},
};
