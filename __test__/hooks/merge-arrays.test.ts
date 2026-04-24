import { describe, expect, it } from "vitest";
import { mergeStringArrays } from "../../src/hooks/merge-arrays.js";

describe("mergeStringArrays", () => {
	it("returns silk array when local is undefined", () => {
		const result = mergeStringArrays(["b", "a"], undefined);
		expect(result).toEqual(["a", "b"]);
	});

	it("merges local entries with silk entries", () => {
		const result = mergeStringArrays(["esbuild"], ["local-dep"]);
		expect(result).toEqual(["esbuild", "local-dep"]);
	});

	it("deduplicates entries", () => {
		const result = mergeStringArrays(["esbuild", "typescript"], ["esbuild", "custom"]);
		expect(result).toEqual(["custom", "esbuild", "typescript"]);
	});

	it("sorts alphabetically", () => {
		const result = mergeStringArrays(["z-pkg", "a-pkg"], ["m-pkg"]);
		expect(result).toEqual(["a-pkg", "m-pkg", "z-pkg"]);
	});

	it("returns empty sorted array when both inputs are empty", () => {
		const result = mergeStringArrays([], undefined);
		expect(result).toEqual([]);
	});
});
