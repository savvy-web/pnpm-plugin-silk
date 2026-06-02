import { describe, expect, it } from "vitest";
import { mergeScalar } from "../../src/hooks/merge-scalar.js";

describe("mergeScalar", () => {
	it("returns silk when child is undefined", () => {
		expect(mergeScalar(true, undefined)).toBe(true);
		expect(mergeScalar(1440, undefined)).toBe(1440);
	});

	it("child wins when defined", () => {
		expect(mergeScalar(true, false)).toBe(false);
		expect(mergeScalar(1440, 0)).toBe(0);
	});

	it("explicit falsy child values win over silk", () => {
		expect(mergeScalar(true, false)).toBe(false);
		expect(mergeScalar(1440, 0)).toBe(0);
	});

	it("returns undefined when both are undefined", () => {
		expect(mergeScalar<boolean>(undefined, undefined)).toBeUndefined();
	});

	it("returns child when silk is undefined", () => {
		expect(mergeScalar(undefined, true)).toBe(true);
	});
});
