/**
 * Catalog merge logic for the updateConfig hook.
 *
 * @packageDocumentation
 * @internal
 */

import type { Catalog } from "../catalogs/types.js";
import type { Override } from "./warnings.js";

/**
 * Merge a single catalog, tracking overrides.
 *
 * @param catalogName - The name of the catalog (e.g., "silk")
 * @param silkCatalog - The Silk-provided catalog entries
 * @param localCatalog - The local catalog entries (may be undefined)
 * @param overrides - Array to collect override information
 * @returns The merged catalog with local entries taking precedence
 *
 * @internal
 */
export function mergeSingleCatalog(
	catalogName: string,
	silkCatalog: Catalog,
	localCatalog: Catalog | undefined,
	overrides: Override[],
): Catalog {
	const merged: Catalog = { ...silkCatalog };

	if (!localCatalog) {
		return merged;
	}

	for (const [pkg, localVersion] of Object.entries(localCatalog)) {
		const silkVersion = silkCatalog[pkg];

		if (silkVersion !== undefined && silkVersion !== localVersion) {
			overrides.push({
				catalog: catalogName,
				package: pkg,
				silkVersion,
				localVersion,
			});
		}

		merged[pkg] = localVersion;
	}

	return merged;
}
