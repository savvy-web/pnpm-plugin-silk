import type { SilkPeerDependencyRules } from "../catalogs/types.js";
import { mergeStringArrays } from "./merge-arrays.js";
import { mergeSingleCatalog } from "./merge-catalogs.js";
import type { Override } from "./warnings.js";

interface PeerDependencyRules {
	allowedVersions?: Record<string, string>;
	ignoreMissing?: string[];
	allowAny?: string[];
}

export function mergePeerDependencyRules(
	silkRules: SilkPeerDependencyRules,
	localRules: PeerDependencyRules | undefined,
	warnings: Override[],
): PeerDependencyRules {
	const mergedAllowedVersions = mergeSingleCatalog(
		"peerDependencyRules.allowedVersions",
		silkRules.allowedVersions,
		localRules?.allowedVersions,
		warnings,
	);
	const mergedIgnoreMissing = mergeStringArrays(silkRules.ignoreMissing, localRules?.ignoreMissing);
	const mergedAllowAny = mergeStringArrays(silkRules.allowAny, localRules?.allowAny);

	return {
		allowedVersions: mergedAllowedVersions,
		ignoreMissing: mergedIgnoreMissing,
		allowAny: mergedAllowAny,
	};
}
