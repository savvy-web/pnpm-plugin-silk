import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	format: "cjs",
	virtualEntries: {
		"pnpmfile.cjs": {
			source: "./src/pnpmfile.ts",
			format: "cjs",
		},
	},
	transform({ pkg }) {
		delete pkg.dependencies;
		delete pkg.devDependencies;
		delete pkg.scripts;
		delete pkg.publishConfig;
		delete pkg.devEngines;
		delete pkg.optionalDependencies;
		return pkg;
	},
});
