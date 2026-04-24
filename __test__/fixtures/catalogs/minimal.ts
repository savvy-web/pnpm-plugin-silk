import type { SilkCatalogs } from "../../../src/catalogs/types.js";

export const minimalCatalogs: SilkCatalogs = {
	silk: {
		typescript: "^5.7.0",
		vitest: "^3.0.0",
	},
	silkPeers: {
		typescript: "^5.7.0",
	},
	silkOverrides: {
		lodash: ">=4.17.23",
	},
	silkOnlyBuiltDependencies: ["esbuild"],
	silkPublicHoistPattern: ["typescript"],
};
