import { defineConfig } from "tsdown";
import { emitDistPackage } from "./lib/packaging/package-json.js";

/**
 * Builds the self-contained `pnpmfile.mjs` config dependency.
 *
 * Per-variant flags are passed on the CLI:
 *   build:dev  → `tsdown --sourcemap --out-dir dist/dev`
 *   build:prod → `tsdown --minify --out-dir dist/npm`
 *
 * The `build:done` hook reads the resolved output directory and writes the
 * trimmed publishable package.json + copies LICENSE/README into it.
 */
export default defineConfig({
	entry: { pnpmfile: "src/pnpmfile.ts" },
	format: "esm",
	platform: "node",
	fixedExtension: true, // → pnpmfile.mjs
	deps: { alwaysBundle: ["effect"] }, // keep the bundle self-contained
	dts: false, // published artifact is only the pnpmfile
	clean: true,
	hooks: {
		"build:done": (ctx) => {
			emitDistPackage(ctx.options.outDir);
		},
	},
});
