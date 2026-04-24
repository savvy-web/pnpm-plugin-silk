import { describe, expect, it } from "vitest";
import { mergeSingleCatalog } from "../../src/hooks/merge-catalogs.js";
import type { Override } from "../../src/hooks/warnings.js";

describe("mergeSingleCatalog", () => {
	it("returns silk catalog when local is undefined", () => {
		const silk = { typescript: "^5.7.0", vitest: "^3.0.0" };
		const overrides: Override[] = [];

		const result = mergeSingleCatalog("silk", silk, undefined, overrides);

		expect(result).toEqual({ typescript: "^5.7.0", vitest: "^3.0.0" });
		expect(overrides).toHaveLength(0);
	});

	it("merges local entries with silk entries", () => {
		const silk = { typescript: "^5.7.0" };
		const local = { "custom-pkg": "^1.0.0" };
		const overrides: Override[] = [];

		const result = mergeSingleCatalog("silk", silk, local, overrides);

		expect(result.typescript).toBe("^5.7.0");
		expect(result["custom-pkg"]).toBe("^1.0.0");
		expect(overrides).toHaveLength(0);
	});

	it("local version wins when it differs from silk", () => {
		const silk = { typescript: "^5.7.0" };
		const local = { typescript: "^5.5.0" };
		const overrides: Override[] = [];

		const result = mergeSingleCatalog("silk", silk, local, overrides);

		expect(result.typescript).toBe("^5.5.0");
	});

	it("records override when local differs from silk", () => {
		const silk = { typescript: "^5.7.0" };
		const local = { typescript: "^5.5.0" };
		const overrides: Override[] = [];

		mergeSingleCatalog("silk", silk, local, overrides);

		expect(overrides).toEqual([
			{
				catalog: "silk",
				package: "typescript",
				silkVersion: "^5.7.0",
				localVersion: "^5.5.0",
			},
		]);
	});

	it("does not record override when local matches silk", () => {
		const silk = { typescript: "^5.7.0" };
		const local = { typescript: "^5.7.0" };
		const overrides: Override[] = [];

		mergeSingleCatalog("silk", silk, local, overrides);

		expect(overrides).toHaveLength(0);
	});

	it("does not record override for new local entries not in silk", () => {
		const silk = { typescript: "^5.7.0" };
		const local = { "new-package": "^1.0.0" };
		const overrides: Override[] = [];

		mergeSingleCatalog("silk", silk, local, overrides);

		expect(overrides).toHaveLength(0);
	});
});
