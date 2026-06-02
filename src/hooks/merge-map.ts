/**
 * Generic map merge: child entries win per key over silk entries.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * Merge a silk-managed map with a child map, child winning on key conflicts.
 *
 * @param silk - The silk-managed map
 * @param child - The child project's map, if any
 * @returns A new map with child entries overlaid on silk entries
 *
 * @internal
 */
export function mergeMap<V>(silk: Record<string, V>, child: Record<string, V> | undefined): Record<string, V> {
	return child ? { ...silk, ...child } : { ...silk };
}
