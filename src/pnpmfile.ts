/**
 * pnpmfile.cjs entry point for @savvy-web/pnpm-plugin-silk.
 *
 * @remarks
 * This file is bundled to CommonJS and loaded by pnpm as a config dependency.
 * It exports the hooks object that pnpm calls during installation.
 *
 * @see https://pnpm.io/pnpmfile
 * @see https://pnpm.io/configDependencies
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
module.exports = {
	hooks: {
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
	},
};
