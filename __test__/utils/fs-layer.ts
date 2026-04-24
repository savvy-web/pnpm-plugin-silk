/**
 * Creates a mock FileSystem layer backed by an in-memory file map.
 *
 * @packageDocumentation
 */

import { SystemError } from "@effect/platform/Error";
import * as FS from "@effect/platform/FileSystem";
import { Effect } from "effect";
import type { Layer } from "effect/Layer";

/**
 * Create a mock FileSystem layer backed by an in-memory file map.
 *
 * - `readFileString` returns content from the map, fails with SystemError if not found
 * - `writeFileString` captures written content to a separate `written` map
 * - `exists` checks if path is in the files map
 *
 * @returns `{ layer, written }` where `layer` is a `Layer<FileSystem>` and
 * `written` is a `Record<string, string>` capturing what was written.
 */
export function makeFsLayer(files: Record<string, string>): {
	layer: Layer<FS.FileSystem>;
	written: Record<string, string>;
} {
	const written: Record<string, string> = {};

	const layer = FS.layerNoop({
		readFileString: (path: string) => {
			if (path in files) {
				// biome-ignore lint/style/noNonNullAssertion: guarded by `path in files` check above
				return Effect.succeed(files[path]!);
			}
			return Effect.fail(
				new SystemError({
					reason: "NotFound",
					module: "FileSystem",
					method: "readFileString",
					pathOrDescriptor: path,
					description: `File not found: ${path}`,
				}),
			);
		},
		writeFileString: (path: string, data: string) => {
			written[path] = data;
			return Effect.void;
		},
		exists: (path: string) => {
			return Effect.succeed(path in files);
		},
	});

	return { layer, written };
}
