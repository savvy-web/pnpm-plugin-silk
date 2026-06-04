/**
 * Build-time helper that produces the trimmed, publishable `package.json` for
 * the pnpm config-dependency artifact and copies the static files alongside it.
 *
 * Invoked from the tsdown `build:done` hook in `tsdown.config.ts`.
 */

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type PackageJson = Record<string, unknown>;

/** Fields that must never appear in the published artifact. */
const STRIP_FIELDS = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"scripts",
	"publishConfig",
	"devEngines",
	"packageManager",
	"private",
] as const;

/** The only files shipped in the published config dependency. */
const DIST_FILES = ["LICENSE", "README.md", "package.json", "pnpmfile.cjs", "pnpmfile.mjs"] as const;

/** Static files copied verbatim into each output directory. */
const COPY_FILES = ["LICENSE", "README.md"] as const;

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Pure transform: returns a new package.json with dev/build-only fields removed
 * and `files` set to the published artifacts. Does not mutate the input.
 */
export function createDistPackageJson(source: PackageJson): PackageJson {
	const result: PackageJson = { ...source };
	for (const field of STRIP_FIELDS) {
		delete result[field];
	}
	result.files = [...DIST_FILES];
	return result;
}

/**
 * Writes the trimmed package.json and copies LICENSE/README into `outDir`.
 * `outDir` may be relative (resolved against the current working directory).
 */
export function emitDistPackage(outDir: string): void {
	const target = resolve(outDir);
	const source = JSON.parse(readFileSync(join(ROOT_DIR, "package.json"), "utf8")) as PackageJson;
	const dist = createDistPackageJson(source);
	writeFileSync(join(target, "package.json"), `${JSON.stringify(dist, null, 2)}\n`);
	for (const file of COPY_FILES) {
		copyFileSync(join(ROOT_DIR, file), join(target, file));
	}
}
