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

import { updateConfig } from "./hooks/update-config.js";

/**
 * pnpm hooks object exported for the pnpmfile entry point.
 *
 * @see https://pnpm.io/pnpmfile#hooks
 *
 * @internal
 */
module.exports = {
	hooks: {
		updateConfig,
	},
};
