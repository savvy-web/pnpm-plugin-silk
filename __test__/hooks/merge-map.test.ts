import { describe, expect, it } from "vitest";
import { mergeMap } from "../../src/hooks/merge-map.js";

describe("mergeMap", () => {
	it("returns a copy of silk when child is undefined", () => {
		const silk = { esbuild: true, "core-js": false };
		const result = mergeMap(silk, undefined);
		expect(result).toEqual({ esbuild: true, "core-js": false });
		expect(result).not.toBe(silk);
	});

	it("child entries win per key", () => {
		const result = mergeMap({ esbuild: false }, { esbuild: true });
		expect(result).toEqual({ esbuild: true });
	});

	it("unions keys from both", () => {
		const result = mergeMap({ a: true }, { b: false });
		expect(result).toEqual({ a: true, b: false });
	});

	it("does not mutate inputs", () => {
		const silk = { a: true };
		const child = { b: false };
		mergeMap(silk, child);
		expect(silk).toEqual({ a: true });
		expect(child).toEqual({ b: false });
	});

	it("works for string-valued maps", () => {
		const result = mergeMap({ lodash: "^4.0.0" }, { lodash: "^4.17.0" });
		expect(result).toEqual({ lodash: "^4.17.0" });
	});
});
