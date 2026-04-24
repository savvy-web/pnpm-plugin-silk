import { describe, expect, it } from "vitest";
import { mergeOverrides } from "../../src/hooks/merge-overrides.js";
import type { Override } from "../../src/hooks/warnings.js";

describe("mergeOverrides", () => {
	it("returns silk overrides when local is undefined", () => {
		const silk = { lodash: ">=4.17.23", tmp: "^0.2.4" };
		const warnings: Override[] = [];

		const result = mergeOverrides(silk, undefined, warnings);

		expect(result).toEqual({ lodash: ">=4.17.23", tmp: "^0.2.4" });
		expect(warnings).toHaveLength(0);
	});

	it("merges local overrides with silk overrides", () => {
		const silk = { lodash: ">=4.17.23" };
		const local = { "custom-pkg": "^1.0.0" };
		const warnings: Override[] = [];

		const result = mergeOverrides(silk, local, warnings);

		expect(result.lodash).toBe(">=4.17.23");
		expect(result["custom-pkg"]).toBe("^1.0.0");
		expect(warnings).toHaveLength(0);
	});

	it("local version wins when it differs from silk", () => {
		const silk = { lodash: ">=4.17.23" };
		const local = { lodash: ">=4.17.20" };
		const warnings: Override[] = [];

		const result = mergeOverrides(silk, local, warnings);

		expect(result.lodash).toBe(">=4.17.20");
	});

	it("records warning when local differs from silk", () => {
		const silk = { lodash: ">=4.17.23" };
		const local = { lodash: ">=4.17.20" };
		const warnings: Override[] = [];

		mergeOverrides(silk, local, warnings);

		expect(warnings).toEqual([
			{
				catalog: "overrides",
				package: "lodash",
				silkVersion: ">=4.17.23",
				localVersion: ">=4.17.20",
			},
		]);
	});

	it("does not warn for new local entries not in silk", () => {
		const silk = { lodash: ">=4.17.23" };
		const local = { "new-pkg": "^1.0.0" };
		const warnings: Override[] = [];

		mergeOverrides(silk, local, warnings);

		expect(warnings).toHaveLength(0);
	});
});
