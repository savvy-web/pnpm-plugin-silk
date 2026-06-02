/**
 * pnpm updateConfig hook implementation.
 *
 * @remarks
 * Merges Silk catalogs into the pnpm configuration, with local overrides
 * taking precedence while emitting warnings. Uses the CatalogProvider
 * service for dependency-injected catalog data.
 *
 * @see https://pnpm.io/pnpmfile#hooks
 *
 * @packageDocumentation
 * @internal
 */

import { Effect } from "effect";
import type { AuditConfig, PackageExtension, SupportedArchitectures } from "../catalogs/types.js";
import { CatalogProvider } from "../services/CatalogProvider.js";
import { PeerDependencyRulesProvider } from "../services/PeerDependencyRulesProvider.js";
import { mergeArrayRecord, mergeStringArrays } from "./merge-arrays.js";
import { mergeSingleCatalog } from "./merge-catalogs.js";
import { mergeMap } from "./merge-map.js";
import { mergeOverrides } from "./merge-overrides.js";
import { mergePeerDependencyRules } from "./merge-peer-dependency-rules.js";
import { mergeScalar } from "./merge-scalar.js";
import type { SecurityWarning } from "./security-warnings.js";
import { detectAllowBuildsLoosening, detectFlagLoosening, detectMinReleaseAgeLoosening } from "./security-warnings.js";
import type { Override } from "./warnings.js";
import { warnOverrides, warnSecurity } from "./warnings.js";

/**
 * Minimal pnpm config type for the fields we interact with.
 *
 * @remarks
 * This interface only declares the fields the plugin reads and writes.
 * pnpm may pass additional fields which are preserved via the index signature.
 *
 * @internal
 */
export interface PnpmConfig {
	/** Named catalogs mapping package names to version ranges. */
	catalogs?: Record<string, Record<string, string>>;
	/** Package version overrides for security fixes. */
	overrides?: Record<string, string>;
	/** Packages to hoist to the virtual store root. */
	publicHoistPattern?: string[];
	/** Map of package matchers to whether their build scripts may run. */
	allowBuilds?: Record<string, boolean>;
	/** Fail installs on unreviewed dependency build scripts. */
	strictDepBuilds?: boolean;
	/** Block exotic sources for transitive dependencies. */
	blockExoticSubdeps?: boolean;
	/** Minimum minutes since publication before a version may install. */
	minimumReleaseAge?: number;
	/** Package patterns excluded from the release-age constraint. */
	minimumReleaseAgeExclude?: string[];
	/** Package metadata extensions. */
	packageExtensions?: Record<string, PackageExtension>;
	/** Deprecation warnings to mute. */
	allowedDeprecatedVersions?: Record<string, string>;
	/** Supported architectures for optional-dependency installs. */
	supportedArchitectures?: SupportedArchitectures;
	/** Audit advisory allowlist. */
	auditConfig?: AuditConfig;
	/** Rules for handling peer dependency warnings and resolution. */
	peerDependencyRules?: {
		allowedVersions?: Record<string, string>;
		ignoreMissing?: string[];
		allowAny?: string[];
	};
	/** Additional pnpm configuration fields (preserved but not modified). */
	[key: string]: unknown;
}

/**
 * The updateConfig hook for pnpm.
 *
 * @remarks
 * Merges Silk's `silk` and `silkPeers` catalogs into the pnpm configuration.
 * Local catalog entries take precedence, but overrides emit prominent warnings
 * to alert users of version mismatches.
 *
 * Also merges `allowBuilds`, `publicHoistPattern`, the pnpm 11 build/security
 * settings (`strictDepBuilds`, `blockExoticSubdeps`, `minimumReleaseAge` and its
 * exclude list), and the `packageExtensions`, `allowedDeprecatedVersions`,
 * `supportedArchitectures`, and `auditConfig` settings, combining Silk defaults
 * with local entries. A child config that weakens a Silk security default emits
 * a prominent security warning.
 *
 * @param config - The current pnpm configuration
 * @returns An Effect that resolves to the modified configuration with Silk catalogs merged
 *
 * @internal
 */
export function updateConfig(
	config: PnpmConfig,
): Effect.Effect<PnpmConfig, never, CatalogProvider | PeerDependencyRulesProvider> {
	return Effect.gen(function* () {
		const catalogs = yield* CatalogProvider;
		const peerDepRules = yield* PeerDependencyRulesProvider;

		const warnings: Override[] = [];
		const securityWarnings: SecurityWarning[] = [];
		const existingCatalogs = config.catalogs ?? {};

		const mergedSilk = mergeSingleCatalog("silk", catalogs.silk, existingCatalogs.silk, warnings);
		const mergedSilkPeers = mergeSingleCatalog("silkPeers", catalogs.silkPeers, existingCatalogs.silkPeers, warnings);
		const mergedOverrides = mergeOverrides(catalogs.silkOverrides, config.overrides, warnings);
		const mergedPublicHoistPattern = mergeStringArrays(catalogs.silkPublicHoistPattern, config.publicHoistPattern);
		const mergedPeerDependencyRules = mergePeerDependencyRules(peerDepRules, config.peerDependencyRules, warnings);

		const mergedAllowBuilds = mergeMap(catalogs.silkAllowBuilds, config.allowBuilds);
		const mergedStrictDepBuilds = mergeScalar(catalogs.silkStrictDepBuilds, config.strictDepBuilds);
		const mergedBlockExoticSubdeps = mergeScalar(catalogs.silkBlockExoticSubdeps, config.blockExoticSubdeps);
		const mergedMinimumReleaseAge = mergeScalar(catalogs.silkMinimumReleaseAge, config.minimumReleaseAge);
		const mergedMinimumReleaseAgeExclude = mergeStringArrays(
			catalogs.silkMinimumReleaseAgeExclude,
			config.minimumReleaseAgeExclude,
		);
		const mergedPackageExtensions = mergeMap(catalogs.silkPackageExtensions, config.packageExtensions);
		const mergedAllowedDeprecatedVersions = mergeMap(
			catalogs.silkAllowedDeprecatedVersions,
			config.allowedDeprecatedVersions,
		);
		const mergedSupportedArchitectures: SupportedArchitectures = mergeArrayRecord(
			catalogs.silkSupportedArchitectures,
			config.supportedArchitectures,
		);
		const mergedAuditConfig: AuditConfig = mergeArrayRecord(catalogs.silkAuditConfig, config.auditConfig);

		securityWarnings.push(...detectAllowBuildsLoosening(catalogs.silkAllowBuilds, config.allowBuilds));
		securityWarnings.push(
			...detectFlagLoosening("strictDepBuilds", catalogs.silkStrictDepBuilds, config.strictDepBuilds),
		);
		securityWarnings.push(
			...detectFlagLoosening("blockExoticSubdeps", catalogs.silkBlockExoticSubdeps, config.blockExoticSubdeps),
		);
		securityWarnings.push(...detectMinReleaseAgeLoosening(catalogs.silkMinimumReleaseAge, config.minimumReleaseAge));

		warnOverrides(warnings);
		warnSecurity(securityWarnings);

		return {
			...config,
			catalogs: {
				...existingCatalogs,
				silk: mergedSilk,
				silkPeers: mergedSilkPeers,
			},
			overrides: mergedOverrides,
			publicHoistPattern: mergedPublicHoistPattern,
			peerDependencyRules: mergedPeerDependencyRules,
			// Managed settings are spread only when they carry content, so the
			// merged config stays lean and consistent with the scalar guards.
			...(Object.keys(mergedAllowBuilds).length > 0 ? { allowBuilds: mergedAllowBuilds } : {}),
			...(mergedStrictDepBuilds !== undefined ? { strictDepBuilds: mergedStrictDepBuilds } : {}),
			...(mergedBlockExoticSubdeps !== undefined ? { blockExoticSubdeps: mergedBlockExoticSubdeps } : {}),
			...(mergedMinimumReleaseAge !== undefined ? { minimumReleaseAge: mergedMinimumReleaseAge } : {}),
			...(mergedMinimumReleaseAgeExclude.length > 0
				? { minimumReleaseAgeExclude: mergedMinimumReleaseAgeExclude }
				: {}),
			...(Object.keys(mergedPackageExtensions).length > 0 ? { packageExtensions: mergedPackageExtensions } : {}),
			...(Object.keys(mergedAllowedDeprecatedVersions).length > 0
				? { allowedDeprecatedVersions: mergedAllowedDeprecatedVersions }
				: {}),
			...(Object.keys(mergedSupportedArchitectures).length > 0
				? { supportedArchitectures: mergedSupportedArchitectures }
				: {}),
			...(Object.keys(mergedAuditConfig).length > 0 ? { auditConfig: mergedAuditConfig } : {}),
		};
	});
}
