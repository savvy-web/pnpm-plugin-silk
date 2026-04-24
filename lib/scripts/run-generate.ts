#!/usr/bin/env node

/**
 * CLI entry point for catalog generation.
 *
 * Resolves paths relative to the project root and runs the Effect program
 * with the live NodeFileSystem layer.
 *
 * Usage: node --import tsx lib/scripts/run-generate.ts
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import { generateCatalogs } from "../../src/generate/generate-catalogs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "../..");

const workspacePath = join(ROOT_DIR, "pnpm-workspace.yaml");
const outputPath = join(ROOT_DIR, "src/catalogs/generated.ts");

console.log("Reading pnpm-workspace.yaml...");

const result = await Effect.runPromise(
	generateCatalogs(workspacePath, outputPath).pipe(Effect.provide(NodeFileSystem.layer)),
);

if (result.warnings.length > 0) {
	console.warn("\nWarnings:");
	for (const warning of result.warnings) {
		console.warn(`  - ${warning}`);
	}
}

console.log("\nDone!");
