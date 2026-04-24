import { describe, expect, it } from "vitest";
import { mergePeerDependencyRules } from "../../src/hooks/merge-peer-dependency-rules.js";
import type { Override } from "../../src/hooks/warnings.js";

describe("mergePeerDependencyRules", () => {
	describe("allowedVersions", () => {
		it("returns silk allowedVersions when local has no peerDependencyRules", () => {
			const silk = {
				allowedVersions: { "eslint-plugin-tsdoc>typescript": "^6.0.0" },
				ignoreMissing: [],
				allowAny: [],
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, undefined, warnings);

			expect(result.allowedVersions).toEqual({ "eslint-plugin-tsdoc>typescript": "^6.0.0" });
			expect(warnings).toHaveLength(0);
		});

		it("merges local allowedVersions with silk allowedVersions", () => {
			const silk = {
				allowedVersions: { "eslint-plugin-tsdoc>typescript": "^6.0.0" },
				ignoreMissing: [],
				allowAny: [],
			};
			const local = {
				allowedVersions: { "my-plugin>react": "^18.0.0" },
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, local, warnings);

			expect(result.allowedVersions?.["eslint-plugin-tsdoc>typescript"]).toBe("^6.0.0");
			expect(result.allowedVersions?.["my-plugin>react"]).toBe("^18.0.0");
			expect(warnings).toHaveLength(0);
		});

		it("local allowedVersions wins on conflict with warning", () => {
			const silk = {
				allowedVersions: { "eslint-plugin-tsdoc>typescript": "^6.0.0" },
				ignoreMissing: [],
				allowAny: [],
			};
			const local = {
				allowedVersions: { "eslint-plugin-tsdoc>typescript": "^5.0.0" },
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, local, warnings);

			expect(result.allowedVersions?.["eslint-plugin-tsdoc>typescript"]).toBe("^5.0.0");
			expect(warnings).toEqual([
				{
					catalog: "peerDependencyRules.allowedVersions",
					package: "eslint-plugin-tsdoc>typescript",
					silkVersion: "^6.0.0",
					localVersion: "^5.0.0",
				},
			]);
		});
	});

	describe("ignoreMissing", () => {
		it("returns silk ignoreMissing when local has none", () => {
			const silk = {
				allowedVersions: {},
				ignoreMissing: ["react"],
				allowAny: [],
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, undefined, warnings);

			expect(result.ignoreMissing).toEqual(["react"]);
		});

		it("merges and deduplicates ignoreMissing", () => {
			const silk = {
				allowedVersions: {},
				ignoreMissing: ["react", "typescript"],
				allowAny: [],
			};
			const local = {
				ignoreMissing: ["react", "vitest"],
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, local, warnings);

			expect(result.ignoreMissing).toEqual(["react", "typescript", "vitest"]);
		});
	});

	describe("allowAny", () => {
		it("returns silk allowAny when local has none", () => {
			const silk = {
				allowedVersions: {},
				ignoreMissing: [],
				allowAny: ["eslint"],
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, undefined, warnings);

			expect(result.allowAny).toEqual(["eslint"]);
		});

		it("merges and deduplicates allowAny", () => {
			const silk = {
				allowedVersions: {},
				ignoreMissing: [],
				allowAny: ["eslint", "prettier"],
			};
			const local = {
				allowAny: ["eslint", "webpack"],
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, local, warnings);

			expect(result.allowAny).toEqual(["eslint", "prettier", "webpack"]);
		});
	});

	describe("combined", () => {
		it("merges all three fields together", () => {
			const silk = {
				allowedVersions: { "pkg>typescript": "^6.0.0" },
				ignoreMissing: ["react"],
				allowAny: ["eslint"],
			};
			const local = {
				allowedVersions: { "other>react": "^18.0.0" },
				ignoreMissing: ["vitest"],
				allowAny: ["prettier"],
			};
			const warnings: Override[] = [];

			const result = mergePeerDependencyRules(silk, local, warnings);

			expect(result.allowedVersions?.["pkg>typescript"]).toBe("^6.0.0");
			expect(result.allowedVersions?.["other>react"]).toBe("^18.0.0");
			expect(result.ignoreMissing).toEqual(["react", "vitest"]);
			expect(result.allowAny).toEqual(["eslint", "prettier"]);
			expect(warnings).toHaveLength(0);
		});
	});
});
