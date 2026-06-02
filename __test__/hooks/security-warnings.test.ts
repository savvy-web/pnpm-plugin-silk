import { describe, expect, it } from "vitest";
import {
	detectAllowBuildsLoosening,
	detectFlagLoosening,
	detectMinReleaseAgeLoosening,
} from "../../src/hooks/security-warnings.js";

describe("detectAllowBuildsLoosening", () => {
	it("warns when child enables a build silk blocked", () => {
		const result = detectAllowBuildsLoosening({ esbuild: false }, { esbuild: true });
		expect(result).toHaveLength(1);
		expect(result[0]?.setting).toBe("allowBuilds.esbuild");
	});

	it("is silent when child tightens (true -> false)", () => {
		expect(detectAllowBuildsLoosening({ esbuild: true }, { esbuild: false })).toEqual([]);
	});

	it("is silent for packages silk did not block", () => {
		expect(detectAllowBuildsLoosening({}, { esbuild: true })).toEqual([]);
	});

	it("is silent when child is undefined", () => {
		expect(detectAllowBuildsLoosening({ esbuild: false }, undefined)).toEqual([]);
	});
});

describe("detectFlagLoosening", () => {
	it("warns when child disables a flag silk enabled", () => {
		const result = detectFlagLoosening("strictDepBuilds", true, false);
		expect(result).toHaveLength(1);
		expect(result[0]?.setting).toBe("strictDepBuilds");
	});

	it("is silent when child keeps it enabled", () => {
		expect(detectFlagLoosening("strictDepBuilds", true, true)).toEqual([]);
	});

	it("is silent when child is undefined", () => {
		expect(detectFlagLoosening("blockExoticSubdeps", true, undefined)).toEqual([]);
	});

	it("is silent when silk did not enable it", () => {
		expect(detectFlagLoosening("strictDepBuilds", undefined, false)).toEqual([]);
	});
});

describe("detectMinReleaseAgeLoosening", () => {
	it("warns when child lowers the age", () => {
		const result = detectMinReleaseAgeLoosening(1440, 60);
		expect(result).toHaveLength(1);
		expect(result[0]?.setting).toBe("minimumReleaseAge");
	});

	it("is silent when child raises or matches", () => {
		expect(detectMinReleaseAgeLoosening(1440, 2880)).toEqual([]);
		expect(detectMinReleaseAgeLoosening(1440, 1440)).toEqual([]);
	});

	it("is silent when either is undefined", () => {
		expect(detectMinReleaseAgeLoosening(undefined, 60)).toEqual([]);
		expect(detectMinReleaseAgeLoosening(1440, undefined)).toEqual([]);
	});
});
