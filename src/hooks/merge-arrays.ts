export function mergeStringArrays(silkArray: readonly string[], localArray: string[] | undefined): string[] {
	const merged = new Set(silkArray);

	if (localArray) {
		for (const item of localArray) {
			merged.add(item);
		}
	}

	return [...merged].sort((a, b) => a.localeCompare(b));
}

/**
 * Merge two records whose values are string arrays, unioning per key.
 *
 * Used for fixed-axis settings like `supportedArchitectures` ({os,cpu,libc})
 * and `auditConfig` ({ignoreGhsas,ignoreCves}). Keys whose merged array is
 * empty are omitted from the result.
 *
 * @param silk - The silk-managed record of arrays
 * @param child - The child project's record of arrays, if any
 * @returns A new record with each key's arrays unioned and sorted
 */
export function mergeArrayRecord(
	silk: Partial<Record<string, readonly string[] | undefined>>,
	child: Partial<Record<string, readonly string[] | undefined>> | undefined,
): Record<string, string[]> {
	const keys = new Set([...Object.keys(silk), ...Object.keys(child ?? {})]);
	const result: Record<string, string[]> = {};

	for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
		const childArray = child?.[key];
		const merged = mergeStringArrays(silk[key] ?? [], childArray ? [...childArray] : undefined);
		if (merged.length > 0) {
			result[key] = merged;
		}
	}

	return result;
}
