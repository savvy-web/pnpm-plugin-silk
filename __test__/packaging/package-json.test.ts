import { describe, expect, it } from "vitest";
import { createDistPackageJson } from "../../lib/packaging/package-json.js";

describe("createDistPackageJson", () => {
	const source = {
		name: "@savvy-web/pnpm-plugin-silk",
		version: "0.13.4",
		type: "module",
		private: true,
		dependencies: { effect: "^3.0.0" },
		devDependencies: { tsdown: "^0.22.1" },
		optionalDependencies: { foo: "1.0.0" },
		scripts: { build: "tsdown" },
		publishConfig: { access: "public" },
		devEngines: { runtime: [] },
		packageManager: "pnpm@11.5.1",
	};

	it("strips dev- and build-only fields", () => {
		const result = createDistPackageJson(source);
		expect(result.dependencies).toBeUndefined();
		expect(result.devDependencies).toBeUndefined();
		expect(result.optionalDependencies).toBeUndefined();
		expect(result.scripts).toBeUndefined();
		expect(result.publishConfig).toBeUndefined();
		expect(result.devEngines).toBeUndefined();
		expect(result.packageManager).toBeUndefined();
	});

	it("removes private so npm will publish the package", () => {
		expect(createDistPackageJson(source).private).toBeUndefined();
	});

	it("keeps type:module and identity fields", () => {
		const result = createDistPackageJson(source);
		expect(result.type).toBe("module");
		expect(result.name).toBe("@savvy-web/pnpm-plugin-silk");
		expect(result.version).toBe("0.13.4");
	});

	it("sets files to the published artifacts including pnpmfile.mjs", () => {
		expect(createDistPackageJson(source).files).toEqual(["LICENSE", "README.md", "package.json", "pnpmfile.mjs"]);
	});

	it("does not mutate the source object", () => {
		createDistPackageJson(source);
		expect(source.dependencies).toEqual({ effect: "^3.0.0" });
	});
});
