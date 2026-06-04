import { defineConfig } from "tsdown";
import { emitDistPackage } from "./lib/packaging/package-json.js";

/**
 * Builds the self-contained `pnpmfile.mjs` and `pnpmfile.cjs` config dependency.
 *
 * Both formats ship because pnpm 11.5.1 resolves config-dependency pnpmfiles
 * with two different code paths: `pnpm install` prefers `pnpmfile.mjs`, while
 * the lifecycle path (`pnpm run`/`pnpm exec`, what Turbo invokes) probes only
 * `pnpmfile.cjs`. Emitting both keeps the plugin working under either path.
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
	format: ["esm", "cjs"],
	platform: "node",
	fixedExtension: true, // → pnpmfile.mjs + pnpmfile.cjs
	deps: { alwaysBundle: ["effect"] }, // keep the bundle self-contained
	dts: false, // published artifact is only the pnpmfile
	clean: true,
	hooks: {
		"build:done": (ctx) => {
			emitDistPackage(ctx.options.outDir);
		},
	},
});
