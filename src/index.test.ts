import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { silkCatalogs } from "./catalogs/index.js";
import type { PnpmConfig } from "./hooks/update-config.js";
import { updateConfig } from "./hooks/update-config.js";
import type { Override } from "./hooks/warnings.js";
import { formatOverrideWarning } from "./hooks/warnings.js";

/**
 * Stable mock catalogs so tests verify merge behavior, not generated config values.
 * The real catalogs are auto-generated and change whenever pnpm-workspace.yaml is updated.
 */
const { mockCatalogs } = vi.hoisted(() => ({
	mockCatalogs: {
		silk: {
			"@rslib/core": "^0.10.0",
			typescript: "^5.7.0",
			vitest: "^3.0.0",
		},
		silkPeers: {
			typescript: "^5.7.0",
		},
		silkOverrides: {
			"@isaacs/brace-expansion": ">=5.0.1",
			lodash: ">=4.17.23",
			tmp: "^0.2.4",
		},
		silkOnlyBuiltDependencies: ["@parcel/watcher", "esbuild"],
		silkPublicHoistPattern: ["turbo", "typescript"],
	},
}));

vi.mock("./catalogs/generated.js", () => ({
	silkCatalogs: mockCatalogs,
}));

describe("silkCatalogs", () => {
	it("exports silk catalog with string version values", () => {
		expect(silkCatalogs.silk).toBeDefined();
		expect(Object.keys(silkCatalogs.silk).length).toBeGreaterThan(0);
		for (const version of Object.values(silkCatalogs.silk)) {
			expect(typeof version).toBe("string");
		}
	});

	it("exports silkPeers catalog with string version values", () => {
		expect(silkCatalogs.silkPeers).toBeDefined();
		expect(Object.keys(silkCatalogs.silkPeers).length).toBeGreaterThan(0);
		for (const version of Object.values(silkCatalogs.silkPeers)) {
			expect(typeof version).toBe("string");
		}
	});

	it("exports silkOverrides for security fixes", () => {
		expect(silkCatalogs.silkOverrides).toBeDefined();
		expect(Object.keys(silkCatalogs.silkOverrides).length).toBeGreaterThan(0);
	});

	it("exports silkOnlyBuiltDependencies array", () => {
		expect(silkCatalogs.silkOnlyBuiltDependencies).toBeDefined();
		expect(Array.isArray(silkCatalogs.silkOnlyBuiltDependencies)).toBe(true);
		expect(silkCatalogs.silkOnlyBuiltDependencies.length).toBeGreaterThan(0);
	});

	it("exports silkPublicHoistPattern array", () => {
		expect(silkCatalogs.silkPublicHoistPattern).toBeDefined();
		expect(Array.isArray(silkCatalogs.silkPublicHoistPattern)).toBe(true);
		expect(silkCatalogs.silkPublicHoistPattern.length).toBeGreaterThan(0);
	});
});

describe("updateConfig", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("adds silk and silkPeers catalogs to empty config", () => {
		const config: PnpmConfig = {};
		const result = updateConfig(config);

		expect(result.catalogs).toBeDefined();
		expect(result.catalogs?.silk).toEqual(silkCatalogs.silk);
		expect(result.catalogs?.silkPeers).toEqual(silkCatalogs.silkPeers);
	});

	it("adds silk catalogs to config with empty catalogs", () => {
		const config: PnpmConfig = { catalogs: {} };
		const result = updateConfig(config);

		expect(result.catalogs?.silk).toEqual(silkCatalogs.silk);
		expect(result.catalogs?.silkPeers).toEqual(silkCatalogs.silkPeers);
	});

	it("preserves existing non-silk catalogs", () => {
		const config: PnpmConfig = {
			catalogs: {
				react17: { react: "^17.0.0" },
			},
		};
		const result = updateConfig(config);

		expect(result.catalogs?.react17).toEqual({ react: "^17.0.0" });
		expect(result.catalogs?.silk).toBeDefined();
	});

	it("merges local silk entries with plugin defaults", () => {
		const config: PnpmConfig = {
			catalogs: {
				silk: {
					"custom-package": "^1.0.0",
				},
			},
		};
		const result = updateConfig(config);

		// Should have both custom package and silk defaults
		expect(result.catalogs?.silk?.["custom-package"]).toBe("^1.0.0");
		expect(result.catalogs?.silk?.typescript).toBe(silkCatalogs.silk.typescript);
	});

	it("allows local overrides with warning", () => {
		const localVersion = "^5.5.0";
		const config: PnpmConfig = {
			catalogs: {
				silk: {
					typescript: localVersion,
				},
			},
		};
		const result = updateConfig(config);

		// Local should win
		expect(result.catalogs?.silk?.typescript).toBe(localVersion);
		// Warning should be emitted
		expect(warnSpy).toHaveBeenCalled();
	});

	it("does not warn when no overrides exist", () => {
		const config: PnpmConfig = {
			catalogs: {
				silk: {
					"new-package": "^1.0.0", // Not in silk defaults
				},
			},
		};
		updateConfig(config);

		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("preserves other config fields", () => {
		const config: PnpmConfig = {
			someOtherSetting: true,
			anotherField: "value",
		};
		const result = updateConfig(config);

		expect(result.someOtherSetting).toBe(true);
		expect(result.anotherField).toBe("value");
	});

	it("adds silk overrides to empty config", () => {
		const config: PnpmConfig = {};
		const result = updateConfig(config);

		expect(result.overrides).toBeDefined();
		expect(result.overrides).toEqual(mockCatalogs.silkOverrides);
	});

	it("merges local overrides with silk overrides", () => {
		const config: PnpmConfig = {
			overrides: {
				"custom-pkg": "^1.0.0",
			},
		};
		const result = updateConfig(config);

		// Should have both custom override and silk defaults
		expect(result.overrides?.["custom-pkg"]).toBe("^1.0.0");
		expect(result.overrides?.["@isaacs/brace-expansion"]).toBe(mockCatalogs.silkOverrides["@isaacs/brace-expansion"]);
	});

	it("allows local override of silk overrides with warning", () => {
		const localVersion = ">=5.0.0";
		const config: PnpmConfig = {
			overrides: {
				"@isaacs/brace-expansion": localVersion,
			},
		};
		const result = updateConfig(config);

		// Local should win
		expect(result.overrides?.["@isaacs/brace-expansion"]).toBe(localVersion);
		// Warning should be emitted
		expect(warnSpy).toHaveBeenCalled();
	});

	it("adds silk onlyBuiltDependencies to empty config", () => {
		const config: PnpmConfig = {};
		const result = updateConfig(config);

		expect(result.onlyBuiltDependencies).toBeDefined();
		expect(result.onlyBuiltDependencies).toContain("esbuild");
		expect(result.onlyBuiltDependencies).toContain("@parcel/watcher");
	});

	it("merges local onlyBuiltDependencies with silk defaults", () => {
		const config: PnpmConfig = {
			onlyBuiltDependencies: ["local-build-dep"],
		};
		const result = updateConfig(config);

		// Should have both silk defaults and local entry
		expect(result.onlyBuiltDependencies).toContain("esbuild");
		expect(result.onlyBuiltDependencies).toContain("local-build-dep");
	});

	it("deduplicates onlyBuiltDependencies entries", () => {
		const config: PnpmConfig = {
			onlyBuiltDependencies: ["esbuild", "custom-dep"],
		};
		const result = updateConfig(config);

		// Should only have one esbuild entry
		const esbuildCount = result.onlyBuiltDependencies?.filter((d) => d === "esbuild").length;
		expect(esbuildCount).toBe(1);
		expect(result.onlyBuiltDependencies).toContain("custom-dep");
	});

	it("adds silk publicHoistPattern to empty config", () => {
		const config: PnpmConfig = {};
		const result = updateConfig(config);

		expect(result.publicHoistPattern).toBeDefined();
		expect(result.publicHoistPattern).toContain("typescript");
		expect(result.publicHoistPattern).toContain("turbo");
	});

	it("merges local publicHoistPattern with silk defaults", () => {
		const config: PnpmConfig = {
			publicHoistPattern: ["local-hoist-pattern"],
		};
		const result = updateConfig(config);

		// Should have both silk defaults and local entry
		expect(result.publicHoistPattern).toContain("typescript");
		expect(result.publicHoistPattern).toContain("local-hoist-pattern");
	});

	it("deduplicates publicHoistPattern entries", () => {
		const config: PnpmConfig = {
			publicHoistPattern: ["typescript", "custom-pattern"],
		};
		const result = updateConfig(config);

		// Should only have one typescript entry
		const typescriptCount = result.publicHoistPattern?.filter((p) => p === "typescript").length;
		expect(typescriptCount).toBe(1);
		expect(result.publicHoistPattern).toContain("custom-pattern");
	});

	it("sorts merged arrays alphabetically", () => {
		const config: PnpmConfig = {
			onlyBuiltDependencies: ["zzz-last", "aaa-first"],
		};
		const result = updateConfig(config);

		// Arrays should be sorted
		const sorted = [...(result.onlyBuiltDependencies ?? [])].sort((a, b) => a.localeCompare(b));
		expect(result.onlyBuiltDependencies).toEqual(sorted);
	});

	it("returns original config on internal error", () => {
		const originalSilk = mockCatalogs.silk;
		Object.defineProperty(mockCatalogs, "silk", {
			get() {
				throw new Error("catalog error");
			},
			configurable: true,
		});

		const config: PnpmConfig = {};
		const result = updateConfig(config);

		expect(result).toBe(config);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Error merging catalogs"), "catalog error");

		// Restore mock property
		Object.defineProperty(mockCatalogs, "silk", {
			value: originalSilk,
			configurable: true,
			writable: true,
		});
	});
});

describe("formatOverrideWarning", () => {
	it("returns empty string for no overrides", () => {
		const result = formatOverrideWarning([]);
		expect(result).toBe("");
	});

	it("formats single override", () => {
		const overrides: Override[] = [
			{
				catalog: "silk",
				package: "typescript",
				silkVersion: "^5.9.4",
				localVersion: "^5.8.0",
			},
		];
		const result = formatOverrideWarning(overrides);

		expect(result).toContain("SILK CATALOG OVERRIDE DETECTED");
		expect(result).toContain("catalogs.silk.typescript");
		expect(result).toContain("^5.9.4");
		expect(result).toContain("^5.8.0");
	});

	it("formats multiple overrides", () => {
		const overrides: Override[] = [
			{
				catalog: "silk",
				package: "typescript",
				silkVersion: "^5.9.4",
				localVersion: "^5.8.0",
			},
			{
				catalog: "silkPeers",
				package: "vitest",
				silkVersion: "^2.0.0 || ^3.0.0",
				localVersion: "^3.0.0",
			},
		];
		const result = formatOverrideWarning(overrides);

		expect(result).toContain("catalogs.silk.typescript");
		expect(result).toContain("catalogs.silkPeers.vitest");
	});

	it("includes revert guidance", () => {
		const overrides: Override[] = [
			{
				catalog: "silk",
				package: "typescript",
				silkVersion: "^5.9.4",
				localVersion: "^5.8.0",
			},
		];
		const result = formatOverrideWarning(overrides);

		expect(result).toContain("pnpm-workspace.yaml");
		expect(result).toContain("Silk defaults");
	});
});
