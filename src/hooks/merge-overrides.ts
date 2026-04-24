/**
 * Override merging for security overrides configuration.
 *
 * @packageDocumentation
 * @internal
 */

import type { Catalog } from "../catalogs/types.js";
import type { Override } from "./warnings.js";

/**
 * Merge silk security overrides with local overrides, tracking conflicts.
 *
 * @param silkOverrides - The silk-managed security overrides
 * @param localOverrides - The local project overrides, if any
 * @param overrideWarnings - Array to push conflict warnings into (mutated)
 * @returns Merged overrides with local versions winning on conflict
 *
 * @internal
 */
export function mergeOverrides(
	silkOverrides: Catalog,
	localOverrides: Catalog | undefined,
	overrideWarnings: Override[],
): Catalog {
	const merged: Catalog = { ...silkOverrides };

	if (!localOverrides) {
		return merged;
	}

	for (const [pkg, localVersion] of Object.entries(localOverrides)) {
		const silkVersion = silkOverrides[pkg];

		if (silkVersion !== undefined && silkVersion !== localVersion) {
			overrideWarnings.push({
				catalog: "overrides",
				package: pkg,
				silkVersion,
				localVersion,
			});
		}

		merged[pkg] = localVersion;
	}

	return merged;
}
