/**
 * Type definitions for Silk catalog management.
 *
 * @packageDocumentation
 */

/**
 * A catalog is a record mapping package names to semver version ranges.
 *
 * @example
 * ```typescript
 * import type { Catalog } from "@savvy-web/pnpm-plugin-silk";
 *
 * const myCatalog: Catalog = {
 *   typescript: "^5.9.0",
 *   vitest: "^4.0.0",
 * };
 * ```
 *
 * @public
 */
export type Catalog = Record<string, string>;

/**
 * A pnpm package extension entry, adding missing metadata to a package.
 *
 * @public
 */
export interface PackageExtension {
	readonly dependencies?: Record<string, string>;
	readonly optionalDependencies?: Record<string, string>;
	readonly peerDependencies?: Record<string, string>;
	readonly peerDependenciesMeta?: Record<string, { readonly optional?: boolean }>;
}

/**
 * Supported architectures for optional-dependency installation.
 *
 * @remarks
 * A type alias (not an interface) so it carries an implicit index signature and
 * can be passed to {@link mergeArrayRecord} without a cast.
 *
 * @public
 */
// biome-ignore lint/style/useConsistentTypeDefinitions: a type alias (not an interface) carries an implicit index signature, letting it pass to mergeArrayRecord without a cast and erroring at compile time if a non-array field is ever added.
export type SupportedArchitectures = {
	readonly os?: readonly string[];
	readonly cpu?: readonly string[];
	readonly libc?: readonly string[];
};

/**
 * Audit advisory allowlist (pnpm 11 prefers GHSA identifiers).
 *
 * @remarks
 * A type alias (not an interface) so it carries an implicit index signature and
 * can be passed to {@link mergeArrayRecord} without a cast.
 *
 * @public
 */
// biome-ignore lint/style/useConsistentTypeDefinitions: a type alias (not an interface) carries an implicit index signature, letting it pass to mergeArrayRecord without a cast and erroring at compile time if a non-array field is ever added.
export type AuditConfig = {
	readonly ignoreGhsas?: readonly string[];
	readonly ignoreCves?: readonly string[];
};

/**
 * The Silk catalogs structure containing two named catalogs for version management.
 *
 * @remarks
 * Use {@link silkCatalogs} to access the pre-configured catalog instance.
 * The `silk` catalog contains pinned current versions for direct dependencies,
 * while `silkPeers` contains permissive ranges suitable for peerDependencies.
 *
 * @example
 * ```typescript
 * import { silkCatalogs } from "@savvy-web/pnpm-plugin-silk";
 * import type { SilkCatalogs } from "@savvy-web/pnpm-plugin-silk";
 *
 * // Access the pre-configured catalogs
 * const typescriptVersion = silkCatalogs.silk.typescript;
 * const peerRange = silkCatalogs.silkPeers.typescript;
 * ```
 *
 * @public
 */
export interface SilkCatalogs {
	/**
	 * Current/latest versions for direct dependencies.
	 * Use with `catalog:silk` in package.json.
	 */
	readonly silk: Catalog;

	/**
	 * Permissive ranges for peerDependencies.
	 * Use with `catalog:silkPeers` in package.json.
	 */
	readonly silkPeers: Catalog;

	/**
	 * Security overrides for known CVEs.
	 * Synced to pnpm `overrides` configuration.
	 */
	readonly silkOverrides: Catalog;

	/**
	 * Packages to hoist to the virtual store root.
	 * Synced to pnpm `publicHoistPattern` configuration.
	 */
	readonly silkPublicHoistPattern: readonly string[];

	/**
	 * Map of package matchers to whether their build scripts may run.
	 * Synced to pnpm `allowBuilds`.
	 */
	readonly silkAllowBuilds: Record<string, boolean>;

	/** Whether installs fail on unreviewed dependency build scripts. */
	readonly silkStrictDepBuilds?: boolean;

	/** Whether transitive deps may use exotic sources (git/tarball). */
	readonly silkBlockExoticSubdeps?: boolean;

	/** Minimum minutes since publication before a version may install. */
	readonly silkMinimumReleaseAge?: number;

	/** Package patterns excluded from the release-age constraint. */
	readonly silkMinimumReleaseAgeExclude: readonly string[];

	/** Package metadata extensions, synced to pnpm `packageExtensions`. */
	readonly silkPackageExtensions: Record<string, PackageExtension>;

	/** Deprecation warnings to mute, synced to `allowedDeprecatedVersions`. */
	readonly silkAllowedDeprecatedVersions: Record<string, string>;

	/** Supported architectures for optional-dependency installs. */
	readonly silkSupportedArchitectures: SupportedArchitectures;

	/** Audit advisory allowlist, synced to `auditConfig`. */
	readonly silkAuditConfig: AuditConfig;

	/**
	 * Whether pnpm prompts for confirmation before purging `node_modules`.
	 * Synced to pnpm `confirmModulesPurge`. Child repos may override freely.
	 */
	readonly silkConfirmModulesPurge?: boolean;
}

/**
 * Peer dependency rules synced from the Silk plugin workspace.
 *
 * @public
 */
export interface SilkPeerDependencyRules {
	/**
	 * Version ranges that suppress unmet peer dependency warnings.
	 * Keys are "package\>peer" dependency paths.
	 */
	readonly allowedVersions: Record<string, string>;

	/**
	 * Package names whose missing peer dependency warnings are suppressed.
	 */
	readonly ignoreMissing: readonly string[];

	/**
	 * Package patterns that resolve to any version regardless of peer range.
	 */
	readonly allowAny: readonly string[];
}
