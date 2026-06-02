/**
 * Warning formatting for catalog override detection.
 *
 * @packageDocumentation
 * @internal
 */

import type { SecurityWarning } from "./security-warnings.js";

/** Width of the warning box in characters. */
const WARNING_BOX_WIDTH = 75;

/**
 * Represents a catalog override where local version differs from Silk-managed version.
 *
 * @internal
 */
export interface Override {
	/** The config section path (e.g., "silk", "overrides", "peerDependencyRules.allowedVersions"). */
	readonly catalog: string;
	/** The package name being overridden. */
	readonly package: string;
	/** The Silk-provided version range. */
	readonly silkVersion: string;
	/** The local override version range. */
	readonly localVersion: string;
}

/**
 * Format a list of overrides into a prominent warning box for console output.
 *
 * @param overrides - Array of override information to format
 * @returns Formatted warning string, or empty string if no overrides
 *
 * @internal
 */
export function formatOverrideWarning(overrides: readonly Override[]): string {
	if (overrides.length === 0) {
		return "";
	}

	const lines: string[] = [];
	const border = "─".repeat(WARNING_BOX_WIDTH - 2);

	lines.push(`┌${border}┐`);
	lines.push(`│  ⚠️  SILK CATALOG OVERRIDE DETECTED${" ".repeat(WARNING_BOX_WIDTH - 39)}│`);
	lines.push(`├${border}┤`);
	lines.push(`│  The following entries override Silk-managed versions:${" ".repeat(WARNING_BOX_WIDTH - 58)}│`);
	lines.push(`│${" ".repeat(WARNING_BOX_WIDTH - 2)}│`);

	for (const override of overrides) {
		const prefix =
			override.catalog === "silk" || override.catalog === "silkPeers"
				? `catalogs.${override.catalog}`
				: override.catalog;
		const catalogPath = `${prefix}.${override.package}`;
		const silkLine = `    Silk version:   ${override.silkVersion}`;
		const localLine = `    Local override: ${override.localVersion}`;

		lines.push(`│  ${catalogPath}${" ".repeat(WARNING_BOX_WIDTH - catalogPath.length - 4)}│`);
		lines.push(`│${silkLine}${" ".repeat(WARNING_BOX_WIDTH - silkLine.length - 2)}│`);
		lines.push(`│${localLine}${" ".repeat(WARNING_BOX_WIDTH - localLine.length - 2)}│`);
		lines.push(`│${" ".repeat(WARNING_BOX_WIDTH - 2)}│`);
	}

	lines.push(
		`│  Local versions will be used. To use Silk defaults, remove these${" ".repeat(WARNING_BOX_WIDTH - 69)}│`,
	);
	lines.push(`│  entries from your pnpm-workspace.yaml.${" ".repeat(WARNING_BOX_WIDTH - 44)}│`);
	lines.push(`└${border}┘`);

	return lines.join("\n");
}

/**
 * Emit override warnings to console if any overrides exist.
 *
 * @param overrides - Array of override information to warn about
 *
 * @internal
 */
export function warnOverrides(overrides: readonly Override[]): void {
	if (overrides.length > 0) {
		console.warn(formatOverrideWarning(overrides));
	}
}

/**
 * Format security-loosening warnings into a prominent box for console output.
 *
 * @param warnings - Security-loosening warnings to format
 * @returns Formatted warning string, or empty string if none
 *
 * @internal
 */
export function formatSecurityWarning(warnings: readonly SecurityWarning[]): string {
	if (warnings.length === 0) {
		return "";
	}

	const lines: string[] = [];
	const border = "─".repeat(WARNING_BOX_WIDTH - 2);

	lines.push(`┌${border}┐`);
	lines.push(`│  ⚠️  SILK SECURITY OVERRIDE DETECTED${" ".repeat(WARNING_BOX_WIDTH - 40)}│`);
	lines.push(`├${border}┤`);
	lines.push(`│  The following entries weaken Silk-managed security defaults:${" ".repeat(WARNING_BOX_WIDTH - 64)}│`);
	lines.push(`│${" ".repeat(WARNING_BOX_WIDTH - 2)}│`);

	for (const warning of warnings) {
		const settingLine = `  ${warning.setting}: Silk=${warning.silkValue} -> local=${warning.childValue}`;
		const detailLine = `    ${warning.detail}`;
		lines.push(`│${settingLine}${" ".repeat(Math.max(0, WARNING_BOX_WIDTH - settingLine.length - 2))}│`);
		lines.push(`│${detailLine}${" ".repeat(Math.max(0, WARNING_BOX_WIDTH - detailLine.length - 2))}│`);
		lines.push(`│${" ".repeat(WARNING_BOX_WIDTH - 2)}│`);
	}

	lines.push(`│  Local values will be used. Review these before shipping.${" ".repeat(WARNING_BOX_WIDTH - 60)}│`);
	lines.push(`└${border}┘`);

	return lines.join("\n");
}

/**
 * Emit security-loosening warnings to console if any exist.
 *
 * @param warnings - Security-loosening warnings to warn about
 *
 * @internal
 */
export function warnSecurity(warnings: readonly SecurityWarning[]): void {
	if (warnings.length > 0) {
		console.warn(formatSecurityWarning(warnings));
	}
}
