import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { generateCatalogs } from "../../src/generate/generate-catalogs.js";
import { makeFsLayer } from "../utils/fs-layer.js";

const FIXTURES = join(import.meta.dirname, "../fixtures/workspaces");

function readFixture(name: string): string {
	return readFileSync(join(FIXTURES, name), "utf-8");
}

describe("generateCatalogs", () => {
	const WORKSPACE_PATH = "/workspace/pnpm-workspace.yaml";
	const OUTPUT_PATH = "/workspace/src/catalogs/generated.ts";
	const FIXED_TIMESTAMP = "2026-01-01T00:00:00.000Z";

	it("generates TypeScript from minimal workspace", () => {
		const yaml = readFixture("minimal-workspace.yaml");
		const { layer, written } = makeFsLayer({ [WORKSPACE_PATH]: yaml });

		const result = Effect.runSync(
			generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(layer)),
		);

		expect(result.warnings).toHaveLength(0);
		expect(written[OUTPUT_PATH]).toBeDefined();
		expect(written[OUTPUT_PATH]).toMatchSnapshot();
	});

	it("generates TypeScript from full workspace", () => {
		const yaml = readFixture("full-workspace.yaml");
		const { layer, written } = makeFsLayer({ [WORKSPACE_PATH]: yaml });

		const result = Effect.runSync(
			generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(layer)),
		);

		expect(result.warnings).toHaveLength(0);
		expect(written[OUTPUT_PATH]).toBeDefined();
		expect(written[OUTPUT_PATH]).toMatchSnapshot();
	});

	it("warns about packages in silk but not silkPeers", () => {
		const yaml = readFixture("missing-peers-workspace.yaml");
		const { layer } = makeFsLayer({ [WORKSPACE_PATH]: yaml });

		const result = Effect.runSync(
			generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(layer)),
		);

		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain("vitest");
	});

	it("fails when silk catalog is missing", () => {
		const yaml = "packages:\n  - .\ncatalogs:\n  silkPeers:\n    typescript: ^5.7.0\n";
		const { layer } = makeFsLayer({ [WORKSPACE_PATH]: yaml });

		const exit = Effect.runSyncExit(
			generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(layer)),
		);

		expect(exit._tag).toBe("Failure");
	});

	it("fails when silkPeers catalog is missing", () => {
		const yaml = "packages:\n  - .\ncatalogs:\n  silk:\n    typescript: ^5.7.0\n";
		const { layer } = makeFsLayer({ [WORKSPACE_PATH]: yaml });

		const exit = Effect.runSyncExit(
			generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(layer)),
		);

		expect(exit._tag).toBe("Failure");
	});

	it("skips write when content unchanged", () => {
		const yaml = readFixture("minimal-workspace.yaml");

		// First pass: generate the content
		const { layer: firstLayer, written: firstWritten } = makeFsLayer({ [WORKSPACE_PATH]: yaml });
		Effect.runSync(generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(firstLayer)));
		expect(firstWritten[OUTPUT_PATH]).toBeDefined();
		const generatedContent = firstWritten[OUTPUT_PATH] as string;

		// Second pass: provide existing output
		const { layer: secondLayer, written: secondWritten } = makeFsLayer({
			[WORKSPACE_PATH]: yaml,
			[OUTPUT_PATH]: generatedContent,
		});
		Effect.runSync(generateCatalogs(WORKSPACE_PATH, OUTPUT_PATH, FIXED_TIMESTAMP).pipe(Effect.provide(secondLayer)));

		// Should not have written (key absent from written map)
		expect(secondWritten[OUTPUT_PATH]).toBeUndefined();
	});
});
