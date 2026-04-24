import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Override } from "../../src/hooks/warnings.js";
import { formatOverrideWarning, warnOverrides } from "../../src/hooks/warnings.js";

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

	it("formats overrides without catalogs prefix", () => {
		const overrides: Override[] = [
			{
				catalog: "overrides",
				package: "lodash",
				silkVersion: ">=4.17.23",
				localVersion: ">=4.17.20",
			},
		];
		const result = formatOverrideWarning(overrides);

		expect(result).toContain("overrides.lodash");
		expect(result).not.toContain("catalogs.overrides");
	});

	it("formats peerDependencyRules without catalogs prefix", () => {
		const overrides: Override[] = [
			{
				catalog: "peerDependencyRules.allowedVersions",
				package: "eslint-plugin-tsdoc>typescript",
				silkVersion: "^6.0.0",
				localVersion: "^5.0.0",
			},
		];
		const result = formatOverrideWarning(overrides);

		expect(result).toContain("peerDependencyRules.allowedVersions.eslint-plugin-tsdoc>typescript");
		expect(result).not.toContain("catalogs.peerDependencyRules");
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

describe("warnOverrides", () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it("does not call console.warn for empty array", () => {
		warnOverrides([]);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it("calls console.warn with formatted warning for non-empty array", () => {
		const overrides: Override[] = [
			{
				catalog: "silk",
				package: "typescript",
				silkVersion: "^5.7.0",
				localVersion: "^5.5.0",
			},
		];
		warnOverrides(overrides);
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(warnSpy.mock.calls[0]?.[0]).toContain("SILK CATALOG OVERRIDE DETECTED");
	});
});
