/**
 * Biome schema URL synchronization for config files.
 *
 * @remarks
 * The silk catalog pins `@biomejs/biome` to a specific version. Consuming repos
 * may have stale `$schema` URLs in their `biome.json`/`biome.jsonc` files. This
 * module detects and updates those URLs to match the catalog version.
 *
 * Uses Node's built-in `fs.promises.glob` with `.gitignore`-aware exclusions
 * via `parse-gitignore` to efficiently locate config files.
 *
 * @packageDocumentation
 * @internal
 */

import { glob, readFile, writeFile } from "node:fs/promises";
import { join, matchesGlob } from "node:path";
import { applyEdits, modify, parse } from "jsonc-parser";
import parseGitignore from "parse-gitignore";

const SCHEMA_URL_PREFIX = "https://biomejs.dev/schemas/";
const SCHEMA_URL_SUFFIX = "/schema.json";
const BIOME_GLOB_PATTERN = "**/biome.{json,jsonc}";

/**
 * Strip range prefixes from a semver version string.
 *
 * @param versionRange - A version range like `^2.3.14`, `~2.3.14`, or `>=2.3.14`
 * @returns The bare semver string, e.g. `2.3.14`
 *
 * @internal
 */
export function extractSemver(versionRange: string): string {
	return versionRange.replace(/^[^\d]*/, "");
}

/**
 * Parse `.gitignore` patterns from the workspace root.
 *
 * @param workspaceRoot - Absolute path to the workspace root
 * @returns Array of gitignore patterns, or empty array if no `.gitignore` exists
 *
 * @internal
 */
export async function parseGitignorePatterns(workspaceRoot: string): Promise<string[]> {
	try {
		const content = await readFile(join(workspaceRoot, ".gitignore"), "utf-8");
		return parseGitignore(content).patterns;
	} catch {
		return [];
	}
}

/**
 * Find biome config files in the workspace using Node's built-in glob,
 * respecting `.gitignore` patterns.
 *
 * @param workspaceRoot - Absolute path to the workspace root
 * @returns Array of relative paths to biome config files
 *
 * @internal
 */
export async function findBiomeConfigs(workspaceRoot: string): Promise<string[]> {
	const ignorePatterns = await parseGitignorePatterns(workspaceRoot);

	const results: string[] = [];
	for await (const entry of glob(BIOME_GLOB_PATTERN, {
		cwd: workspaceRoot,
		exclude: (name) => ignorePatterns.some((pattern) => matchesGlob(name, pattern)),
	})) {
		results.push(entry);
	}
	return results;
}

/**
 * Build the expected biome schema URL for a given version.
 *
 * @param version - The bare semver version (e.g. `2.3.14`)
 * @returns The full schema URL
 */
function buildSchemaUrl(version: string): string {
	return `${SCHEMA_URL_PREFIX}${version}${SCHEMA_URL_SUFFIX}`;
}

/**
 * Synchronize biome config `$schema` URLs with the catalog version.
 *
 * @remarks
 * Finds all `biome.json`/`biome.jsonc` files, compares their `$schema` URL
 * version against the catalog version, and updates mismatches using
 * comment-preserving JSONC edits.
 *
 * @param workspaceRoot - Absolute path to the workspace root
 * @param biomeVersion - The biome version from the silk catalog (may include range prefix)
 *
 * @internal
 */
export async function syncBiomeSchema(workspaceRoot: string, biomeVersion: string): Promise<void> {
	try {
		const version = extractSemver(biomeVersion);
		const expectedUrl = buildSchemaUrl(version);
		const configs = await findBiomeConfigs(workspaceRoot);

		for (const relativePath of configs) {
			const configPath = join(workspaceRoot, relativePath);
			const content = await readFile(configPath, "utf-8");
			const parsed = parse(content);

			if (typeof parsed?.$schema !== "string") {
				continue;
			}

			if (parsed.$schema === expectedUrl) {
				continue;
			}

			if (!parsed.$schema.startsWith(SCHEMA_URL_PREFIX)) {
				continue;
			}

			const edits = modify(content, ["$schema"], expectedUrl, {});
			const updated = applyEdits(content, edits);
			await writeFile(configPath, updated, "utf-8");

			console.warn(`[pnpm-plugin-silk] Updated biome schema in ${relativePath} to v${version}`);
		}
	} catch (error) {
		console.warn(
			"[pnpm-plugin-silk] Error syncing biome schema:",
			error instanceof Error ? error.message : String(error),
		);
	}
}
