import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

	it("adds silk allowBuilds to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.allowBuilds?.esbuild).toBe(true);
		expect(result.allowBuilds?.["@parcel/watcher"]).toBe(true);
	});

	it("merges allowBuilds with child entries winning per key", () => {
		const result = runUpdateConfig({
			allowBuilds: { "custom-dep": true },
		});

		expect(result.allowBuilds?.["custom-dep"]).toBe(true);
		expect(result.allowBuilds?.esbuild).toBe(true);
	});

	it("adds silk allowedDeprecatedVersions to empty config", () => {
		const catalogs = {
			...fullCatalogs,
			silkAllowedDeprecatedVersions: { glob: "7.2.3", inflight: "1.0.6" },
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(updateConfig({}).pipe(Effect.provide(layer)));

		expect(result.allowedDeprecatedVersions?.glob).toBe("7.2.3");
		expect(result.allowedDeprecatedVersions?.inflight).toBe("1.0.6");
	});

	it("merges allowedDeprecatedVersions with child entries winning per key and no warning", () => {
		const catalogs = {
			...fullCatalogs,
			silkAllowedDeprecatedVersions: { glob: "7.2.3", inflight: "1.0.6" },
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(
			updateConfig({
				// Child overrides glob and adds its own entry.
				allowedDeprecatedVersions: { glob: "8.0.0", "custom-dep": "1.2.3" },
			}).pipe(Effect.provide(layer)),
		);

		expect(result.allowedDeprecatedVersions?.glob).toBe("8.0.0");
		expect(result.allowedDeprecatedVersions?.inflight).toBe("1.0.6");
		expect(result.allowedDeprecatedVersions?.["custom-dep"]).toBe("1.2.3");
		expect(warnSpy).not.toHaveBeenCalled();
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

	it("excludes @savvy-web/cli and @savvy-web/mcp from publicHoistPattern in the Silk source monorepo", () => {
		const catalogs = {
			...fullCatalogs,
			silkPublicHoistPattern: [...fullCatalogs.silkPublicHoistPattern, "@savvy-web/cli", "@savvy-web/mcp"],
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(
			updateConfig({ rootProjectManifest: { name: "savvy-web-systems" } }).pipe(Effect.provide(layer)),
		);

		expect(result.publicHoistPattern).not.toContain("@savvy-web/cli");
		expect(result.publicHoistPattern).not.toContain("@savvy-web/mcp");
		expect(result.publicHoistPattern).toContain("typescript");
	});

	it("keeps @savvy-web/cli and @savvy-web/mcp in publicHoistPattern for consumer repos", () => {
		const catalogs = {
			...fullCatalogs,
			silkPublicHoistPattern: [...fullCatalogs.silkPublicHoistPattern, "@savvy-web/cli", "@savvy-web/mcp"],
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(
			updateConfig({ rootProjectManifest: { name: "some-consumer-app" } }).pipe(Effect.provide(layer)),
		);

		expect(result.publicHoistPattern).toContain("@savvy-web/cli");
		expect(result.publicHoistPattern).toContain("@savvy-web/mcp");
	});

	it("detects the source monorepo via workspaceDir when rootProjectManifest is absent", () => {
		// pnpm's `updateConfig` does NOT pass `rootProjectManifest`; it passes `workspaceDir`/`lockfileDir`.
		const dir = mkdtempSync(join(tmpdir(), "silk-root-"));
		writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "savvy-web-systems" }));
		const catalogs = {
			...fullCatalogs,
			silkPublicHoistPattern: [...fullCatalogs.silkPublicHoistPattern, "@savvy-web/cli", "@savvy-web/mcp"],
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(updateConfig({ workspaceDir: dir }).pipe(Effect.provide(layer)));

		expect(result.publicHoistPattern).not.toContain("@savvy-web/cli");
		expect(result.publicHoistPattern).not.toContain("@savvy-web/mcp");
	});

	it("excludes @vitest-agent/cli and @vitest-agent/mcp from publicHoistPattern in the vitest-agent source monorepo", () => {
		const catalogs = {
			...fullCatalogs,
			silkPublicHoistPattern: [...fullCatalogs.silkPublicHoistPattern, "@vitest-agent/cli", "@vitest-agent/mcp"],
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(
			updateConfig({ rootProjectManifest: { name: "vitest-agent" } }).pipe(Effect.provide(layer)),
		);

		expect(result.publicHoistPattern).not.toContain("@vitest-agent/cli");
		expect(result.publicHoistPattern).not.toContain("@vitest-agent/mcp");
		expect(result.publicHoistPattern).toContain("typescript");
	});

	it("keeps @vitest-agent/cli and @vitest-agent/mcp in publicHoistPattern for consumer repos", () => {
		const catalogs = {
			...fullCatalogs,
			silkPublicHoistPattern: [...fullCatalogs.silkPublicHoistPattern, "@vitest-agent/cli", "@vitest-agent/mcp"],
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(
			updateConfig({ rootProjectManifest: { name: "some-consumer-app" } }).pipe(Effect.provide(layer)),
		);

		expect(result.publicHoistPattern).toContain("@vitest-agent/cli");
		expect(result.publicHoistPattern).toContain("@vitest-agent/mcp");
	});

	it("excludes only the source repo's own workspace-local packages", () => {
		// In the vitest-agent repo, the @savvy-web/* pair are real registry packages
		// and must stay hoisted; only @vitest-agent/* are workspace-local there.
		const catalogs = {
			...fullCatalogs,
			silkPublicHoistPattern: [
				...fullCatalogs.silkPublicHoistPattern,
				"@savvy-web/cli",
				"@savvy-web/mcp",
				"@vitest-agent/cli",
				"@vitest-agent/mcp",
			],
		};
		const layer = Layer.merge(makeCatalogLayer(catalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const result = Effect.runSync(
			updateConfig({ rootProjectManifest: { name: "vitest-agent" } }).pipe(Effect.provide(layer)),
		);

		expect(result.publicHoistPattern).toContain("@savvy-web/cli");
		expect(result.publicHoistPattern).toContain("@savvy-web/mcp");
		expect(result.publicHoistPattern).not.toContain("@vitest-agent/cli");
		expect(result.publicHoistPattern).not.toContain("@vitest-agent/mcp");
	});

	it("sorts merged arrays alphabetically", () => {
		const result = runUpdateConfig({
			publicHoistPattern: ["zzz-last", "aaa-first"],
		});

		const sorted = [...(result.publicHoistPattern ?? [])].sort((a, b) => a.localeCompare(b));
		expect(result.publicHoistPattern).toEqual(sorted);
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

	it("applies the silk confirmModulesPurge default to empty config", () => {
		const result = runUpdateConfig({});

		expect(result.confirmModulesPurge).toBe(false);
	});

	it("lets a child confirmModulesPurge value win without warning", () => {
		const result = runUpdateConfig({ confirmModulesPurge: true });

		expect(result.confirmModulesPurge).toBe(true);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});
