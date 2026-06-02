/**
 * Generic scalar merge: an explicit child value wins; otherwise the silk
 * default applies. Only an absent (undefined) child value receives the default,
 * so an explicit `false` or `0` from the child is preserved.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * Merge a silk-managed scalar default with a child value.
 *
 * @param silk - The silk-managed default (may be undefined)
 * @param child - The child project's value (may be undefined)
 * @returns The child value if defined, otherwise the silk default
 *
 * @internal
 */
export function mergeScalar<T>(silk: T | undefined, child: T | undefined): T | undefined {
	return child ?? silk;
}
