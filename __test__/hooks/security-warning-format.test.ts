import { describe, expect, it } from "vitest";
import { formatSecurityWarning } from "../../src/hooks/warnings.js";

describe("formatSecurityWarning", () => {
	it("returns empty string for no warnings", () => {
		expect(formatSecurityWarning([])).toBe("");
	});

	it("renders a box that names the setting and the loosening", () => {
		const out = formatSecurityWarning([
			{
				setting: "strictDepBuilds",
				silkValue: "true",
				childValue: "false",
				detail: 'Disables the "strictDepBuilds" security check that Silk enabled.',
			},
		]);
		expect(out).toContain("SILK SECURITY OVERRIDE DETECTED");
		expect(out).toContain("strictDepBuilds");
		expect(out).toContain("Disables");
	});
});
