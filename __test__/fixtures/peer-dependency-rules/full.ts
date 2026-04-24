import type { SilkPeerDependencyRules } from "../../../src/catalogs/types.js";

export const fullPeerDependencyRules: SilkPeerDependencyRules = {
	allowedVersions: {
		"react-dom>react": "^18.0.0 || ^19.0.0",
		"@testing-library/react>react": "^18.0.0 || ^19.0.0",
	},
	ignoreMissing: ["@babel/core"],
	allowAny: ["eslint"],
};
