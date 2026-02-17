import { glob, readFile, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { silkCatalogs } from "./catalogs/index.js";
import {
	extractSemver,
	findBiomeConfigs,
	parseGitignorePatterns,
	shouldSyncBiomeSchema,
	syncBiomeSchema,
} from "./hooks/sync-biome-schema.js";
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

vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return {
		...actual,
		readFile: vi.fn(actual.readFile),
		writeFile: vi.fn(actual.writeFile),
		glob: vi.fn(actual.glob),
	};
});

const mockedReadFile = vi.mocked(readFile);
const mockedWriteFile = vi.mocked(writeFile);
const mockedGlob = vi.mocked(glob);

describe("extractSemver", () => {
	it("strips caret prefix", () => {
		expect(extractSemver("^2.3.14")).toBe("2.3.14");
	});

	it("strips tilde prefix", () => {
		expect(extractSemver("~2.3.14")).toBe("2.3.14");
	});

	it("strips gte prefix", () => {
		expect(extractSemver(">=2.3.14")).toBe("2.3.14");
	});

	it("strips gt prefix", () => {
		expect(extractSemver(">2.3.14")).toBe("2.3.14");
	});

	it("strips lte prefix", () => {
		expect(extractSemver("<=2.3.14")).toBe("2.3.14");
	});

	it("strips eq prefix", () => {
		expect(extractSemver("=2.3.14")).toBe("2.3.14");
	});

	it("returns bare semver unchanged", () => {
		expect(extractSemver("2.3.14")).toBe("2.3.14");
	});

	it("handles prerelease versions", () => {
		expect(extractSemver("^2.4.0-beta.1")).toBe("2.4.0-beta.1");
	});
});

describe("shouldSyncBiomeSchema", () => {
	afterEach(() => {
		mockedReadFile.mockReset();
	});

	it("returns true when @savvy-web/lint-staged is in devDependencies", async () => {
		mockedReadFile.mockResolvedValueOnce(JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }));
		expect(await shouldSyncBiomeSchema("/fake/root")).toBe(true);
	});

	it("returns true when @savvy-web/lint-staged is in dependencies", async () => {
		mockedReadFile.mockResolvedValueOnce(JSON.stringify({ dependencies: { "@savvy-web/lint-staged": "^0.3.0" } }));
		expect(await shouldSyncBiomeSchema("/fake/root")).toBe(true);
	});

	it("returns false when @savvy-web/lint-staged is absent", async () => {
		mockedReadFile.mockResolvedValueOnce(JSON.stringify({ devDependencies: { vitest: "^4.0.0" } }));
		expect(await shouldSyncBiomeSchema("/fake/root")).toBe(false);
	});

	it("returns false when package.json cannot be read", async () => {
		mockedReadFile.mockRejectedValueOnce(new Error("ENOENT"));
		expect(await shouldSyncBiomeSchema("/fake/root")).toBe(false);
	});
});

describe("parseGitignorePatterns", () => {
	afterEach(() => {
		mockedReadFile.mockReset();
	});

	it("parses .gitignore patterns", async () => {
		mockedReadFile.mockResolvedValueOnce("node_modules\ndist\n# comment\n*.log\n");
		const patterns = await parseGitignorePatterns("/fake/root");
		expect(patterns).toContain("node_modules");
		expect(patterns).toContain("dist");
		expect(patterns).toContain("*.log");
		expect(patterns).not.toContain("# comment");
	});

	it("returns empty array when .gitignore missing", async () => {
		mockedReadFile.mockRejectedValueOnce(new Error("ENOENT"));
		const patterns = await parseGitignorePatterns("/fake/root");
		expect(patterns).toEqual([]);
	});
});

describe("findBiomeConfigs", () => {
	afterEach(() => {
		mockedReadFile.mockReset();
		mockedGlob.mockReset();
	});

	it("returns glob results as array", async () => {
		mockedReadFile.mockRejectedValueOnce(new Error("ENOENT"));

		async function* fakeGlob() {
			yield "biome.jsonc";
			yield "packages/app/biome.json";
		}
		mockedGlob.mockReturnValueOnce(fakeGlob() as ReturnType<typeof glob>);

		const results = await findBiomeConfigs("/root");
		expect(results).toEqual(["biome.jsonc", "packages/app/biome.json"]);
	});

	it("passes gitignore patterns to glob exclude", async () => {
		mockedReadFile.mockResolvedValueOnce("node_modules\ndist\n");

		async function* fakeGlob() {
			yield "biome.jsonc";
		}
		mockedGlob.mockReturnValueOnce(fakeGlob() as ReturnType<typeof glob>);

		await findBiomeConfigs("/root");

		expect(mockedGlob).toHaveBeenCalledWith("**/biome.{json,jsonc}", {
			cwd: "/root",
			exclude: expect.any(Function),
		});
	});
});

describe("syncBiomeSchema", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
		mockedReadFile.mockReset();
		mockedWriteFile.mockReset();
		mockedGlob.mockReset();
	});

	function mockGlob(...files: string[]) {
		async function* fakeGlob() {
			for (const f of files) yield f;
		}
		mockedGlob.mockReturnValueOnce(fakeGlob() as ReturnType<typeof glob>);
	}

	function mockFs(fileMap: Record<string, string>) {
		mockedReadFile.mockImplementation(async (path: Parameters<typeof readFile>[0]) => {
			const p = String(path);
			for (const [key, value] of Object.entries(fileMap)) {
				if (p.endsWith(key)) return value;
			}
			throw new Error(`ENOENT: ${p}`);
		});
		mockedWriteFile.mockResolvedValue();
	}

	it("skips sync when @savvy-web/lint-staged not in package.json", async () => {
		mockedReadFile.mockResolvedValueOnce(JSON.stringify({ devDependencies: {} }));

		await syncBiomeSchema("/fake/root", "^2.3.14");

		expect(mockedGlob).not.toHaveBeenCalled();
		expect(mockedWriteFile).not.toHaveBeenCalled();
	});

	it("updates $schema URL when version mismatches", async () => {
		const oldContent = '{\n\t"$schema": "https://biomejs.dev/schemas/2.3.10/schema.json",\n\t"root": true\n}\n';
		mockFs({
			"package.json": JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }),
			".gitignore": "node_modules\n",
			"biome.json": oldContent,
		});
		mockGlob("biome.json");

		await syncBiomeSchema("/root", "^2.3.14");

		expect(mockedWriteFile).toHaveBeenCalledOnce();
		const writtenContent = mockedWriteFile.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain("https://biomejs.dev/schemas/2.3.14/schema.json");
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Updated biome schema"));
	});

	it("preserves comments and formatting in JSONC files", async () => {
		const jsoncContent =
			'{\n\t// Biome configuration\n\t"$schema": "https://biomejs.dev/schemas/2.3.10/schema.json",\n\t"root": true\n}\n';
		mockFs({
			"package.json": JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }),
			".gitignore": "",
			"biome.jsonc": jsoncContent,
		});
		mockGlob("biome.jsonc");

		await syncBiomeSchema("/root", "^2.3.14");

		expect(mockedWriteFile).toHaveBeenCalledOnce();
		const writtenContent = mockedWriteFile.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain("// Biome configuration");
		expect(writtenContent).toContain("https://biomejs.dev/schemas/2.3.14/schema.json");
	});

	it("handles missing $schema field gracefully (no-op)", async () => {
		mockFs({
			"package.json": JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }),
			".gitignore": "",
			"biome.json": '{\n\t"root": true\n}\n',
		});
		mockGlob("biome.json");

		await syncBiomeSchema("/root", "^2.3.14");

		expect(mockedWriteFile).not.toHaveBeenCalled();
	});

	it("skips files already at correct version", async () => {
		mockFs({
			"package.json": JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }),
			".gitignore": "",
			"biome.json": '{\n\t"$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",\n\t"root": true\n}\n',
		});
		mockGlob("biome.json");

		await syncBiomeSchema("/root", "^2.3.14");

		expect(mockedWriteFile).not.toHaveBeenCalled();
	});

	it("skips files with non-biomejs.dev schema URLs", async () => {
		mockFs({
			"package.json": JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }),
			".gitignore": "",
			"biome.json": '{\n\t"$schema": "https://example.com/schemas/biome.json",\n\t"root": true\n}\n',
		});
		mockGlob("biome.json");

		await syncBiomeSchema("/root", "^2.3.14");

		expect(mockedWriteFile).not.toHaveBeenCalled();
	});

	it("strips range prefixes from catalog version", async () => {
		mockFs({
			"package.json": JSON.stringify({ devDependencies: { "@savvy-web/lint-staged": "^0.3.0" } }),
			".gitignore": "",
			"biome.json": '{\n\t"$schema": "https://biomejs.dev/schemas/2.3.10/schema.json",\n\t"root": true\n}\n',
		});
		mockGlob("biome.json");

		await syncBiomeSchema("/root", "~2.3.14");

		const writtenContent = mockedWriteFile.mock.calls[0]?.[1] as string;
		expect(writtenContent).toContain("https://biomejs.dev/schemas/2.3.14/schema.json");
	});
});
