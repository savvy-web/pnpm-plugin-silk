import { describe, expect, it } from "vitest";
import { mergeArrayRecord } from "../../src/hooks/merge-arrays.js";

describe("mergeArrayRecord", () => {
	it("unions arrays per key and sorts", () => {
		const result = mergeArrayRecord({ os: ["linux"], cpu: ["x64"] }, { os: ["darwin"] });
		expect(result).toEqual({ cpu: ["x64"], os: ["darwin", "linux"] });
	});

	it("returns silk copy when child is undefined", () => {
		const result = mergeArrayRecord({ ignoreGhsas: ["GHSA-1"] }, undefined);
		expect(result).toEqual({ ignoreGhsas: ["GHSA-1"] });
	});

	it("dedupes within a key", () => {
		const result = mergeArrayRecord({ os: ["linux"] }, { os: ["linux", "darwin"] });
		expect(result).toEqual({ os: ["darwin", "linux"] });
	});

	it("omits keys whose merged array is empty", () => {
		const result = mergeArrayRecord({ os: [] }, undefined);
		expect(result).toEqual({});
	});

	it("includes child-only keys", () => {
		const result = mergeArrayRecord({ os: ["linux"] }, { libc: ["glibc"] });
		expect(result).toEqual({ libc: ["glibc"], os: ["linux"] });
	});
});
