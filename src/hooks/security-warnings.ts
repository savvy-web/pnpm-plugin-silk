/**
 * Pure detectors for child configs that loosen silk-managed security posture.
 *
 * Loosening is judged by security impact, not raw value direction:
 * - allowBuilds: child enables (true) a build silk blocked (false)
 * - boolean flags: child disables (false) a flag silk enabled (true)
 * - minimumReleaseAge: child sets a value lower than silk's
 *
 * @packageDocumentation
 * @internal
 */

/**
 * A detected security-loosening divergence between silk and a child config.
 *
 * @internal
 */
export interface SecurityWarning {
	/** The setting path, e.g. "allowBuilds.esbuild", "strictDepBuilds". */
	readonly setting: string;
	/** The silk-managed value, rendered for display. */
	readonly silkValue: string;
	/** The child value, rendered for display. */
	readonly childValue: string;
	/** Human-readable explanation of how the child weakens security. */
	readonly detail: string;
}

/**
 * Detect packages where the child enables a build script silk blocked.
 *
 * @internal
 */
export function detectAllowBuildsLoosening(
	silk: Record<string, boolean>,
	child: Record<string, boolean> | undefined,
): SecurityWarning[] {
	if (!child) {
		return [];
	}

	const warnings: SecurityWarning[] = [];
	for (const [pkg, childAllowed] of Object.entries(child)) {
		if (childAllowed === true && silk[pkg] === false) {
			warnings.push({
				setting: `allowBuilds.${pkg}`,
				silkValue: "false",
				childValue: "true",
				detail: `Enables build scripts for "${pkg}" that Silk blocked.`,
			});
		}
	}
	return warnings;
}

/**
 * Detect a boolean security flag the child disabled but silk enabled.
 *
 * @internal
 */
export function detectFlagLoosening(
	name: string,
	silk: boolean | undefined,
	child: boolean | undefined,
): SecurityWarning[] {
	if (silk === true && child === false) {
		return [
			{
				setting: name,
				silkValue: "true",
				childValue: "false",
				detail: `Disables the "${name}" security check that Silk enabled.`,
			},
		];
	}
	return [];
}

/**
 * Detect a minimumReleaseAge the child lowered below silk's value.
 *
 * @internal
 */
export function detectMinReleaseAgeLoosening(silk: number | undefined, child: number | undefined): SecurityWarning[] {
	if (typeof silk === "number" && typeof child === "number" && child < silk) {
		return [
			{
				setting: "minimumReleaseAge",
				silkValue: String(silk),
				childValue: String(child),
				detail: `Shortens the release-age quarantine from ${silk} to ${child} minutes.`,
			},
		];
	}
	return [];
}
