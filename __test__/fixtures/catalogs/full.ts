import type { SilkCatalogs } from "../../../src/catalogs/types.js";

export const fullCatalogs: SilkCatalogs = {
	silk: {
		"@rslib/core": "^0.10.0",
		typescript: "^5.7.0",
		vitest: "^3.0.0",
	},
	silkPeers: {
		typescript: "^5.7.0",
	},
	silkOverrides: {
		"@isaacs/brace-expansion": ">=5.0.1",
		lodash: ">=4.17.23",
		tmp: "^0.2.4",
	},
	silkPublicHoistPattern: ["turbo", "typescript"],
	silkAllowBuilds: { "@parcel/watcher": true, esbuild: true, "core-js": false },
	silkStrictDepBuilds: true,
	silkBlockExoticSubdeps: true,
	silkMinimumReleaseAge: 1440,
	silkMinimumReleaseAgeExclude: ["@savvy-web/*"],
	silkPackageExtensions: {},
	silkAllowedDeprecatedVersions: {},
	silkSupportedArchitectures: { os: ["linux"], cpu: ["x64"] },
	silkAuditConfig: {},
};
