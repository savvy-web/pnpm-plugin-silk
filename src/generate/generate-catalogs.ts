/**
 * Effect program that generates TypeScript catalog files from pnpm-workspace.yaml.
 *
 * Uses the FileSystem service for all I/O, making it testable with mock filesystems.
 *
 * @packageDocumentation
 */

import { FileSystem } from "@effect/platform/FileSystem";
import { Data, Effect } from "effect";
import { parse as parseYaml } from "yaml";

/**
 * Typed error for catalog generation failures.
 */
export class GenerateError extends Data.TaggedError("GenerateError")<{
	readonly message: string;
}> {}

interface WorkspaceConfig {
	catalogs?: {
		silk?: Record<string, string>;
		silkPeers?: Record<string, string>;
	};
	overrides?: Record<string, string>;
	/** Legacy pnpm <11 field; folded into allowBuilds as `name: true`. */
	onlyBuiltDependencies?: string[];
	allowBuilds?: Record<string, boolean>;
	publicHoistPattern?: string[];
	strictDepBuilds?: boolean;
	blockExoticSubdeps?: boolean;
	minimumReleaseAge?: number;
	minimumReleaseAgeExclude?: string[];
	packageExtensions?: Record<string, unknown>;
	allowedDeprecatedVersions?: Record<string, string>;
	supportedArchitectures?: { os?: string[]; cpu?: string[]; libc?: string[] };
	auditConfig?: { ignoreGhsas?: string[]; ignoreCves?: string[] };
	peerDependencyRules?: {
		allowedVersions?: Record<string, string>;
		ignoreMissing?: string[];
		allowAny?: string[];
	};
}

/**
 * Format a catalog object as TypeScript code.
 */
function formatCatalog(catalog: Record<string, string>, indent = "\t\t"): string {
	const entries = Object.entries(catalog)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([pkg, version]) => {
			// Quote package names that contain special characters
			const key = pkg.includes("/") || pkg.includes("-") ? `"${pkg}"` : pkg;
			return `${indent}${key}: "${version}",`;
		});
	return entries.join("\n");
}

/**
 * Format a string array as TypeScript code.
 */
function formatStringArray(items: string[], indent = "\t\t"): string {
	const sortedItems = [...items].sort((a, b) => a.localeCompare(b));
	return sortedItems.map((item) => `${indent}"${item}",`).join("\n");
}

/**
 * Format a string array as a complete TypeScript array literal.
 * Returns `[]` for empty arrays and multi-line `[\n...\n\t]` for non-empty ones.
 */
function formatArrayLiteral(items: string[], indent = "\t\t"): string {
	if (items.length === 0) return "[]";
	const inner = formatStringArray(items, indent);
	return `[\n${inner}\n\t]`;
}

/**
 * Format a catalog object as a complete TypeScript object literal.
 * Returns `{}` for empty objects and multi-line `{\n...\n\t}` for non-empty ones.
 */
function formatCatalogLiteral(catalog: Record<string, string>, indent = "\t\t"): string {
	if (Object.keys(catalog).length === 0) return "{}";
	const inner = formatCatalog(catalog, indent);
	return `{\n${inner}\n\t}`;
}

/**
 * Format a boolean map as a complete TypeScript object literal (biome-clean).
 * Returns `{}` for empty maps and a sorted multi-line literal otherwise.
 */
function formatBoolMapLiteral(map: Record<string, boolean>, indent = "\t\t"): string {
	const keys = Object.keys(map);
	if (keys.length === 0) {
		return "{}";
	}
	const entries = keys
		.sort((a, b) => a.localeCompare(b))
		.map((pkg) => {
			const key = pkg.includes("/") || pkg.includes("-") ? `"${pkg}"` : pkg;
			return `${indent}${key}: ${map[pkg]},`;
		})
		.join("\n");
	return `{\n${entries}\n\t}`;
}

/**
 * Recursively sort object keys for deterministic serialization. Arrays keep
 * their order; primitives pass through.
 */
function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(sortKeys);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => [k, sortKeys(v)]),
		);
	}
	return value;
}

/**
 * Serialize a JSON-compatible value as a TypeScript literal indented to sit as
 * a field value at one tab of nesting inside the generated object.
 */
function serialize(value: unknown): string {
	return JSON.stringify(sortKeys(value), null, "\t").split("\n").join("\n\t");
}

/**
 * Generate the TypeScript catalog file content.
 */
function generateContent(
	silk: Record<string, string>,
	silkPeers: Record<string, string>,
	silkOverrides: Record<string, string>,
	silkPublicHoistPattern: string[],
	silkAllowBuilds: Record<string, boolean>,
	security: {
		strictDepBuilds: boolean | undefined;
		blockExoticSubdeps: boolean | undefined;
		minimumReleaseAge: number | undefined;
		minimumReleaseAgeExclude: string[];
	},
	silkPackageExtensions: Record<string, unknown>,
	silkAllowedDeprecatedVersions: Record<string, string>,
	silkSupportedArchitectures: { os?: string[]; cpu?: string[]; libc?: string[] },
	silkAuditConfig: { ignoreGhsas?: string[]; ignoreCves?: string[] },
	silkPeerDependencyRules: { allowedVersions: Record<string, string>; ignoreMissing: string[]; allowAny: string[] },
	timestamp: string,
): string {
	const scalarLines = [
		security.strictDepBuilds !== undefined ? `\tsilkStrictDepBuilds: ${security.strictDepBuilds},` : "",
		security.blockExoticSubdeps !== undefined ? `\tsilkBlockExoticSubdeps: ${security.blockExoticSubdeps},` : "",
		security.minimumReleaseAge !== undefined ? `\tsilkMinimumReleaseAge: ${security.minimumReleaseAge},` : "",
	].filter((line) => line !== "");

	return `/**
 * Auto-generated Silk catalog definitions.
 *
 * DO NOT EDIT THIS FILE DIRECTLY.
 * Instead, update pnpm-workspace.yaml and run: pnpm run generate:catalogs
 *
 * Generated: ${timestamp}
 *
 * @packageDocumentation
 */

import type { SilkCatalogs, SilkPeerDependencyRules } from "./types.js";

/**
 * The complete Silk catalogs generated from pnpm-workspace.yaml.
 */
export const silkCatalogs: SilkCatalogs = {
\tsilk: {
${formatCatalog(silk)}
\t},
\tsilkPeers: {
${formatCatalog(silkPeers)}
\t},
\tsilkOverrides: {
${formatCatalog(silkOverrides)}
\t},
\tsilkPublicHoistPattern: [
${formatStringArray(silkPublicHoistPattern)}
\t],
\tsilkAllowBuilds: ${formatBoolMapLiteral(silkAllowBuilds)},
${scalarLines.join("\n")}
\tsilkMinimumReleaseAgeExclude: ${formatArrayLiteral(security.minimumReleaseAgeExclude)},
\tsilkPackageExtensions: ${serialize(silkPackageExtensions)},
\tsilkAllowedDeprecatedVersions: ${formatCatalogLiteral(silkAllowedDeprecatedVersions)},
\tsilkSupportedArchitectures: ${serialize(silkSupportedArchitectures)},
\tsilkAuditConfig: ${serialize(silkAuditConfig)},
};

/**
 * Peer dependency rules generated from pnpm-workspace.yaml.
 */
export const silkPeerDependencyRules: SilkPeerDependencyRules = {
\tallowedVersions: ${formatCatalogLiteral(silkPeerDependencyRules.allowedVersions)},
\tignoreMissing: ${formatArrayLiteral(silkPeerDependencyRules.ignoreMissing)},
\tallowAny: ${formatArrayLiteral(silkPeerDependencyRules.allowAny)},
};
`;
}

/**
 * Generate TypeScript catalog file from a workspace YAML configuration.
 *
 * @param workspacePath - Absolute path to pnpm-workspace.yaml
 * @param outputPath - Absolute path to the output TypeScript file
 * @param timestamp - Optional fixed timestamp for deterministic output (ISO string)
 * @returns Effect that yields `{ warnings: string[] }` on success
 */
export function generateCatalogs(
	workspacePath: string,
	outputPath: string,
	timestamp?: string,
): Effect.Effect<{ warnings: string[] }, GenerateError, FileSystem> {
	return Effect.gen(function* () {
		const fs = yield* FileSystem;

		// Read and parse workspace config
		const yamlContent = yield* fs.readFileString(workspacePath).pipe(
			Effect.mapError(
				(err) =>
					new GenerateError({
						message: `Failed to read workspace config: ${err.message}`,
					}),
			),
		);

		const config = parseYaml(yamlContent) as WorkspaceConfig;

		// Validate required catalogs
		if (!config.catalogs?.silk) {
			return yield* new GenerateError({
				message: "No 'catalogs.silk' found in pnpm-workspace.yaml",
			});
		}

		if (!config.catalogs?.silkPeers) {
			return yield* new GenerateError({
				message: "No 'catalogs.silkPeers' found in pnpm-workspace.yaml",
			});
		}

		const silk = config.catalogs.silk;
		const silkPeers = config.catalogs.silkPeers;
		const silkOverrides = config.overrides ?? {};
		const silkPublicHoistPattern = config.publicHoistPattern ?? [];

		const silkAllowBuilds: Record<string, boolean> = {};
		for (const name of config.onlyBuiltDependencies ?? []) {
			silkAllowBuilds[name] = true;
		}
		Object.assign(silkAllowBuilds, config.allowBuilds ?? {});

		const security = {
			strictDepBuilds: config.strictDepBuilds,
			blockExoticSubdeps: config.blockExoticSubdeps,
			minimumReleaseAge: config.minimumReleaseAge,
			minimumReleaseAgeExclude: config.minimumReleaseAgeExclude ?? [],
		};
		const silkPackageExtensions = config.packageExtensions ?? {};
		const silkAllowedDeprecatedVersions = config.allowedDeprecatedVersions ?? {};
		const silkSupportedArchitectures = config.supportedArchitectures ?? {};
		const silkAuditConfig = config.auditConfig ?? {};

		const silkPeerDependencyRules = {
			allowedVersions: config.peerDependencyRules?.allowedVersions ?? {},
			ignoreMissing: config.peerDependencyRules?.ignoreMissing ?? [],
			allowAny: config.peerDependencyRules?.allowAny ?? [],
		};

		const ts = timestamp ?? new Date().toISOString();
		const content = generateContent(
			silk,
			silkPeers,
			silkOverrides,
			silkPublicHoistPattern,
			silkAllowBuilds,
			security,
			silkPackageExtensions,
			silkAllowedDeprecatedVersions,
			silkSupportedArchitectures,
			silkAuditConfig,
			silkPeerDependencyRules,
			ts,
		);

		// Only write if content changed (ignoring the timestamp line)
		const timestampPattern = / \* Generated: .+/;
		const stripTimestamp = (s: string) => s.replace(timestampPattern, "");

		const fileExists = yield* fs.exists(outputPath).pipe(
			Effect.mapError(
				(err) =>
					new GenerateError({
						message: `Failed to check output file: ${err.message}`,
					}),
			),
		);

		const warnings = Object.keys(silk)
			.filter((pkg) => !(pkg in silkPeers))
			.map((pkg) => `Package in silk but not silkPeers: ${pkg}`);

		if (fileExists) {
			const existing = yield* fs.readFileString(outputPath).pipe(
				Effect.mapError(
					(err) =>
						new GenerateError({
							message: `Failed to read existing output: ${err.message}`,
						}),
				),
			);

			if (stripTimestamp(existing) === stripTimestamp(content)) {
				return { warnings };
			}
		}

		// Write the generated content
		yield* fs.writeFileString(outputPath, content).pipe(
			Effect.mapError(
				(err) =>
					new GenerateError({
						message: `Failed to write output: ${err.message}`,
					}),
			),
		);

		return { warnings };
	});
}
