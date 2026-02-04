import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { silkCatalogs } from "./catalogs/index.js";
import type { PnpmConfig } from "./hooks/update-config.js";
import { updateConfig } from "./hooks/update-config.js";
import type { Override } from "./hooks/warnings.js";
import { formatOverrideWarning } from "./hooks/warnings.js";

describe("silkCatalogs", () => {
	it("exports silk catalog with current versions", () => {
		expect(silkCatalogs.silk).toBeDefined();
		expect(typeof silkCatalogs.silk.typescript).toBe("string");
		expect(silkCatalogs.silk.typescript).toMatch(/^\^5\./);
	});

	it("exports silkPeers catalog with version ranges", () => {
		expect(silkCatalogs.silkPeers).toBeDefined();
		expect(typeof silkCatalogs.silkPeers.typescript).toBe("string");
		expect(silkCatalogs.silkPeers.typescript).toMatch(/^\^5\./);
	});

	it("includes build tools in silk catalog", () => {
		expect(silkCatalogs.silk["@rslib/core"]).toBeDefined();
		expect(silkCatalogs.silk.typescript).toBeDefined();
	});

	it("includes testing tools in silk catalog", () => {
		expect(silkCatalogs.silk.vitest).toBeDefined();
	});

	it("exports silkOverrides for security fixes", () => {
		expect(silkCatalogs.silkOverrides).toBeDefined();
		expect(silkCatalogs.silkOverrides["@isaacs/brace-expansion"]).toBe(">=5.0.1");
		expect(silkCatalogs.silkOverrides.lodash).toBe(">=4.17.23");
		expect(silkCatalogs.silkOverrides.tmp).toBe(">=0.2.4");
	});

	it("exports silkOnlyBuiltDependencies array", () => {
		expect(silkCatalogs.silkOnlyBuiltDependencies).toBeDefined();
		expect(Array.isArray(silkCatalogs.silkOnlyBuiltDependencies)).toBe(true);
		expect(silkCatalogs.silkOnlyBuiltDependencies).toContain("esbuild");
		expect(silkCatalogs.silkOnlyBuiltDependencies).toContain("@parcel/watcher");
	});

	it("exports silkPublicHoistPattern array", () => {
		expect(silkCatalogs.silkPublicHoistPattern).toBeDefined();
		expect(Array.isArray(silkCatalogs.silkPublicHoistPattern)).toBe(true);
		expect(silkCatalogs.silkPublicHoistPattern).toContain("typescript");
		expect(silkCatalogs.silkPublicHoistPattern).toContain("turbo");
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
		expect(result.overrides?.["@isaacs/brace-expansion"]).toBe(">=5.0.1");
		expect(result.overrides?.lodash).toBe(">=4.17.23");
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
		expect(result.overrides?.["@isaacs/brace-expansion"]).toBe(">=5.0.1");
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
