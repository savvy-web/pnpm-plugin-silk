import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PnpmConfig } from "../../src/hooks/update-config.js";
import { updateConfig } from "../../src/hooks/update-config.js";
import { fullCatalogs } from "../fixtures/catalogs/full.js";
import { fullPeerDependencyRules } from "../fixtures/peer-dependency-rules/full.js";
import { makeCatalogLayer } from "../utils/catalog-layer.js";
import { makePeerDependencyRulesLayer } from "../utils/peer-dependency-rules-layer.js";

const TestLayer = Layer.merge(makeCatalogLayer(fullCatalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));

function runUpdateConfig(config: PnpmConfig): PnpmConfig {
	return Effect.runSync(updateConfig(config).pipe(Effect.provide(TestLayer)));
}

describe("updateConfig", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("adds silk and silkPeers catalogs to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.catalogs?.silk).toEqual(fullCatalogs.silk);
		expect(result.catalogs?.silkPeers).toEqual(fullCatalogs.silkPeers);
	});

	it("adds silk catalogs to config with empty catalogs", () => {
		const result = runUpdateConfig({ catalogs: {} });

		expect(result.catalogs?.silk).toEqual(fullCatalogs.silk);
		expect(result.catalogs?.silkPeers).toEqual(fullCatalogs.silkPeers);
	});

	it("preserves existing non-silk catalogs", () => {
		const result = runUpdateConfig({
			catalogs: { react17: { react: "^17.0.0" } },
		});

		expect(result.catalogs?.react17).toEqual({ react: "^17.0.0" });
		expect(result.catalogs?.silk).toBeDefined();
	});

	it("merges local silk entries with plugin defaults", () => {
		const result = runUpdateConfig({
			catalogs: { silk: { "custom-package": "^1.0.0" } },
		});

		expect(result.catalogs?.silk?.["custom-package"]).toBe("^1.0.0");
		expect(result.catalogs?.silk?.typescript).toBe(fullCatalogs.silk.typescript);
	});

	it("allows local overrides with warning", () => {
		const result = runUpdateConfig({
			catalogs: { silk: { typescript: "^5.5.0" } },
		});

		expect(result.catalogs?.silk?.typescript).toBe("^5.5.0");
		expect(warnSpy).toHaveBeenCalled();
	});

	it("does not warn when no overrides exist", () => {
		runUpdateConfig({
			catalogs: { silk: { "new-package": "^1.0.0" } },
		});

		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("preserves other config fields", () => {
		const result = runUpdateConfig({
			someOtherSetting: true,
			anotherField: "value",
		});

		expect(result.someOtherSetting).toBe(true);
		expect(result.anotherField).toBe("value");
	});

	it("adds silk overrides to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.overrides).toEqual(fullCatalogs.silkOverrides);
	});

	it("merges local overrides with silk overrides", () => {
		const result = runUpdateConfig({
			overrides: { "custom-pkg": "^1.0.0" },
		});

		expect(result.overrides?.["custom-pkg"]).toBe("^1.0.0");
		expect(result.overrides?.["@isaacs/brace-expansion"]).toBe(fullCatalogs.silkOverrides["@isaacs/brace-expansion"]);
	});

	it("allows local override of silk overrides with warning", () => {
		const result = runUpdateConfig({
			overrides: { "@isaacs/brace-expansion": ">=5.0.0" },
		});

		expect(result.overrides?.["@isaacs/brace-expansion"]).toBe(">=5.0.0");
		expect(warnSpy).toHaveBeenCalled();
	});

	it("adds silk onlyBuiltDependencies to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.onlyBuiltDependencies).toContain("esbuild");
		expect(result.onlyBuiltDependencies).toContain("@parcel/watcher");
	});

	it("merges and deduplicates onlyBuiltDependencies", () => {
		const result = runUpdateConfig({
			onlyBuiltDependencies: ["esbuild", "custom-dep"],
		});

		const esbuildCount = result.onlyBuiltDependencies?.filter((d) => d === "esbuild").length;
		expect(esbuildCount).toBe(1);
		expect(result.onlyBuiltDependencies).toContain("custom-dep");
	});

	it("adds silk publicHoistPattern to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.publicHoistPattern).toContain("typescript");
		expect(result.publicHoistPattern).toContain("turbo");
	});

	it("merges and deduplicates publicHoistPattern", () => {
		const result = runUpdateConfig({
			publicHoistPattern: ["typescript", "custom-pattern"],
		});

		const tsCount = result.publicHoistPattern?.filter((p) => p === "typescript").length;
		expect(tsCount).toBe(1);
		expect(result.publicHoistPattern).toContain("custom-pattern");
	});

	it("sorts merged arrays alphabetically", () => {
		const result = runUpdateConfig({
			onlyBuiltDependencies: ["zzz-last", "aaa-first"],
		});

		const sorted = [...(result.onlyBuiltDependencies ?? [])].sort((a, b) => a.localeCompare(b));
		expect(result.onlyBuiltDependencies).toEqual(sorted);
	});

	it("adds silk peerDependencyRules to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.peerDependencyRules?.allowedVersions).toEqual(fullPeerDependencyRules.allowedVersions);
		expect(result.peerDependencyRules?.ignoreMissing).toContain("@babel/core");
		expect(result.peerDependencyRules?.allowAny).toContain("eslint");
	});

	it("merges local peerDependencyRules with silk rules", () => {
		const result = runUpdateConfig({
			peerDependencyRules: {
				ignoreMissing: ["my-extra-pkg"],
			},
		});

		expect(result.peerDependencyRules?.ignoreMissing).toContain("my-extra-pkg");
		expect(result.peerDependencyRules?.ignoreMissing).toContain("@babel/core");
	});

	it("local peerDependencyRules allowedVersions wins with warning", () => {
		const result = runUpdateConfig({
			peerDependencyRules: {
				allowedVersions: { "react-dom>react": "^17.0.0" },
			},
		});

		expect(result.peerDependencyRules?.allowedVersions?.["react-dom>react"]).toBe("^17.0.0");
		expect(warnSpy).toHaveBeenCalled();
	});
});
