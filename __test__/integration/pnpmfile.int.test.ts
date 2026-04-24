import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PnpmConfig } from "../../src/hooks/update-config.js";
import { updateConfig } from "../../src/hooks/update-config.js";
import { fullCatalogs } from "../fixtures/catalogs/full.js";
import { minimalCatalogs } from "../fixtures/catalogs/minimal.js";
import { fullPeerDependencyRules } from "../fixtures/peer-dependency-rules/full.js";
import { minimalPeerDependencyRules } from "../fixtures/peer-dependency-rules/minimal.js";
import { makeCatalogLayer } from "../utils/catalog-layer.js";
import { makePeerDependencyRulesLayer } from "../utils/peer-dependency-rules-layer.js";

describe("pnpmfile integration", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("merges minimal catalogs into empty config", () => {
		const layer = Layer.merge(
			makeCatalogLayer(minimalCatalogs),
			makePeerDependencyRulesLayer(minimalPeerDependencyRules),
		);
		const config: PnpmConfig = {};

		const result = Effect.runSync(updateConfig(config).pipe(Effect.provide(layer)));

		expect(result).toMatchSnapshot();
	});

	it("merges full catalogs into empty config", () => {
		const layer = Layer.merge(makeCatalogLayer(fullCatalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const config: PnpmConfig = {};

		const result = Effect.runSync(updateConfig(config).pipe(Effect.provide(layer)));

		expect(result).toMatchSnapshot();
	});

	it("merges full catalogs with local overrides", () => {
		const layer = Layer.merge(makeCatalogLayer(fullCatalogs), makePeerDependencyRulesLayer(fullPeerDependencyRules));
		const config: PnpmConfig = {
			catalogs: {
				silk: { typescript: "^5.5.0" },
				myApp: { react: "^18.0.0" },
			},
			overrides: { "custom-security-fix": "^1.0.0" },
			onlyBuiltDependencies: ["my-native-dep"],
			publicHoistPattern: ["my-cli-tool"],
		};

		const result = Effect.runSync(updateConfig(config).pipe(Effect.provide(layer)));

		expect(result.catalogs?.silk?.typescript).toBe("^5.5.0");
		expect(result.catalogs?.myApp).toEqual({ react: "^18.0.0" });
		expect(result.overrides?.["custom-security-fix"]).toBe("^1.0.0");
		expect(result.onlyBuiltDependencies).toContain("my-native-dep");
		expect(result.publicHoistPattern).toContain("my-cli-tool");
		expect(warnSpy).toHaveBeenCalled();

		expect(result).toMatchSnapshot();
	});
});
