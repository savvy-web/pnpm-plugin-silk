export function mergeStringArrays(silkArray: readonly string[], localArray: string[] | undefined): string[] {
	const merged = new Set(silkArray);

	if (localArray) {
		for (const item of localArray) {
			merged.add(item);
		}
	}

	return [...merged].sort((a, b) => a.localeCompare(b));
}
