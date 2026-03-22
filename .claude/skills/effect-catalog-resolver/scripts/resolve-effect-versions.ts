#!/usr/bin/env bun
/**
 * Discovers all Effect ecosystem packages from npm, resolves a compatible
 * latest version set, and outputs structured JSON for the agent to present.
 *
 * Usage: bun .claude/skills/effect-catalog-resolver/scripts/resolve-effect-versions.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

// ── Types ──────────────────────────────────────────────────────────────

interface PackageMetadata {
	name: string;
	description: string;
	latest: string;
	versions: string[];
	peerDependencies: Record<string, string>;
	/** Per-version peer deps for all stable versions (from packument) */
	versionPeerDeps: Map<string, Record<string, string>>;
	deprecated: boolean;
}

interface TrackedEntry {
	name: string;
	currentSilk: string;
	resolvedSilk: string;
	currentSilkPeers: string;
	resolvedSilkPeers: string;
	peerDeps: Record<string, string>;
	changed: boolean;
}

interface UntrackedEntry {
	name: string;
	description: string;
	resolvedSilk: string;
	resolvedSilkPeers: string;
	peerDeps: Record<string, string>;
}

interface ConflictEntry {
	name: string;
	latest: string;
	compatibleVersion: string | null;
	requires: string;
	reason: string;
}

interface ResolverOutput {
	effectCore: {
		current: string;
		resolved: string;
	};
	tracked: TrackedEntry[];
	untracked: UntrackedEntry[];
	conflicts: ConflictEntry[];
	error: string | null;
}

interface ResolutionResult {
	effectVersion: string;
	resolved: Map<string, { version: string; peerDeps: Record<string, string> }>;
	conflicts: ConflictEntry[];
}

interface WorkspaceConfig {
	catalogs?: {
		silk?: Record<string, string>;
		silkPeers?: Record<string, string>;
	};
}

// ── Helpers ────────────────────────────────────────────────────────────

function fail(message: string): never {
	const output: ResolverOutput = {
		effectCore: { current: "", resolved: "" },
		tracked: [],
		untracked: [],
		conflicts: [],
		error: message,
	};
	console.log(JSON.stringify(output, null, 2));
	process.exit(1);
}

// ── Semver helpers ─────────────────────────────────────────────────────

function compareSemver(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

function satisfiesRange(version: string, range: string): boolean {
	const vParts = version.split(".").map(Number);
	const extractVersion = (r: string): string => r.replace(/^[\^>=~]+/, "").split(/\s/)[0];

	if (range.startsWith(">=")) {
		const minVersion = extractVersion(range);
		return compareSemver(version, minVersion) >= 0;
	}
	if (range.startsWith("^")) {
		const baseVersion = extractVersion(range);
		const baseParts = baseVersion.split(".").map(Number);
		if (compareSemver(version, baseVersion) < 0) return false;
		if (baseParts[0] !== 0) return vParts[0] === baseParts[0];
		if (baseParts[1] !== 0) return vParts[0] === 0 && vParts[1] === baseParts[1];
		return vParts[0] === 0 && vParts[1] === 0 && vParts[2] === baseParts[2];
	}
	// Unrecognised range format — warn and treat as incompatible
	console.error(`Warning: unrecognised range format "${range}" for version "${version}"`);
	return false;
}

function extractFloor(range: string): string {
	return range.replace(/^[\^>=~]+/, "").split(/\s/)[0];
}

// ── Discovery ──────────────────────────────────────────────────────────

/**
 * Discover all Effect ecosystem packages from the npm registry.
 * Uses the registry search API, supplemented by current catalog entries.
 */
async function discoverPackages(currentlyTracked: string[]): Promise<string[]> {
	const packages = new Set<string>();

	// Primary: npm registry search API
	const searchUrl = "https://registry.npmjs.org/-/v1/search?text=%40effect&size=250";
	const response = await fetch(searchUrl);
	if (!response.ok) {
		console.error(`Warning: npm search failed (${response.status}), falling back to catalog entries`);
	} else {
		const data = (await response.json()) as {
			objects: Array<{ package: { name: string } }>;
		};
		for (const obj of data.objects) {
			const name = obj.package.name;
			if (name === "effect" || name.startsWith("@effect/")) {
				packages.add(name);
			}
		}
	}

	// Always include effect core
	packages.add("effect");

	// Supplement with currently tracked packages (may not appear in search)
	for (const name of currentlyTracked) {
		packages.add(name);
	}

	return [...packages].sort();
}

// ── Metadata fetching ──────────────────────────────────────────────────

async function fetchPackageMetadata(name: string): Promise<PackageMetadata | null> {
	const url = `https://registry.npmjs.org/${name}`;
	const response = await fetch(url);
	if (!response.ok) return null;

	const data = (await response.json()) as {
		name: string;
		description?: string;
		"dist-tags"?: Record<string, string>;
		versions?: Record<string, { peerDependencies?: Record<string, string>; deprecated?: string }>;
	};

	const latest = data["dist-tags"]?.latest;
	if (!latest) return null;
	const latestMeta = data.versions?.[latest];
	if (!latestMeta) return null;
	if (latestMeta.deprecated) return null;

	const allVersions = Object.keys(data.versions ?? {});
	const stableVersions = allVersions.filter((v) => !v.includes("-")).sort(compareSemver);

	const versionPeerDeps = new Map<string, Record<string, string>>();
	for (const v of stableVersions) {
		const vMeta = data.versions?.[v];
		if (vMeta) versionPeerDeps.set(v, vMeta.peerDependencies ?? {});
	}

	return {
		name,
		description: data.description ?? "",
		latest,
		versions: stableVersions,
		peerDependencies: latestMeta.peerDependencies ?? {},
		versionPeerDeps,
		deprecated: false,
	};
}

async function fetchAllMetadata(packageNames: string[]): Promise<Map<string, PackageMetadata>> {
	const results = await Promise.all(packageNames.map(fetchPackageMetadata));
	const metadata = new Map<string, PackageMetadata>();
	for (let i = 0; i < packageNames.length; i++) {
		const meta = results[i];
		if (meta) metadata.set(packageNames[i], meta);
	}
	return metadata;
}

// ── YAML reading ───────────────────────────────────────────────────────

function readCurrentCatalog(rootDir: string): {
	silk: Map<string, string>;
	silkPeers: Map<string, string>;
} {
	const yamlPath = join(rootDir, "pnpm-workspace.yaml");
	let content: string;
	try {
		content = readFileSync(yamlPath, "utf-8");
	} catch {
		fail(`Cannot read ${yamlPath}`);
	}
	const config = parseYaml(content) as WorkspaceConfig;
	const silk = new Map<string, string>();
	const silkPeers = new Map<string, string>();
	const isEffectPkg = (name: string) => name === "effect" || name.startsWith("@effect/");
	for (const [name, version] of Object.entries(config.catalogs?.silk ?? {})) {
		if (isEffectPkg(name)) silk.set(name, version);
	}
	for (const [name, version] of Object.entries(config.catalogs?.silkPeers ?? {})) {
		if (isEffectPkg(name)) silkPeers.set(name, version);
	}
	return { silk, silkPeers };
}

// ── Resolution algorithm ───────────────────────────────────────────────

function isCompatible(peerDeps: Record<string, string>, resolvedVersions: Map<string, string>): boolean {
	for (const [dep, range] of Object.entries(peerDeps)) {
		if (dep !== "effect" && !dep.startsWith("@effect/")) continue;
		const resolved = resolvedVersions.get(dep);
		if (!resolved) continue;
		if (!satisfiesRange(resolved, range)) return false;
	}
	return true;
}

function findCompatibleVersion(meta: PackageMetadata, resolvedVersions: Map<string, string>): string | null {
	const versions = [...meta.versions].reverse();
	for (const version of versions) {
		const peerDeps = meta.versionPeerDeps.get(version) ?? {};
		if (isCompatible(peerDeps, resolvedVersions)) return version;
	}
	return null;
}

function resolveVersions(metadata: Map<string, PackageMetadata>, effectPackageNames: string[]): ResolutionResult {
	const effectMeta = metadata.get("effect");
	if (!effectMeta) fail("effect core package not found in npm registry");
	const effectVersion = effectMeta.latest;
	const resolved = new Map<string, string>();
	resolved.set("effect", effectVersion);
	const conflicts: ConflictEntry[] = [];
	const packageMetas = effectPackageNames
		.filter((name) => name !== "effect" && metadata.has(name))
		.map((name) => metadata.get(name) as PackageMetadata);

	const withEffectPeers = packageMetas.filter((meta) =>
		Object.keys(meta.peerDependencies).some((dep) => dep === "effect" || dep.startsWith("@effect/")),
	);
	const withoutEffectPeers = packageMetas.filter(
		(meta) => !Object.keys(meta.peerDependencies).some((dep) => dep === "effect" || dep.startsWith("@effect/")),
	);

	for (const meta of withoutEffectPeers) resolved.set(meta.name, meta.latest);

	const MAX_ITERATIONS = 5;
	for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
		let changed = false;
		for (const meta of withEffectPeers) {
			if (isCompatible(meta.peerDependencies, resolved)) {
				const prev = resolved.get(meta.name);
				if (prev !== meta.latest) {
					resolved.set(meta.name, meta.latest);
					changed = true;
				}
			} else {
				const compatible = findCompatibleVersion(meta, resolved);
				if (compatible != null) {
					if (resolved.get(meta.name) !== compatible) {
						resolved.set(meta.name, compatible);
						changed = true;
					}
				} else {
					resolved.delete(meta.name);
				}
			}
		}
		if (!changed) break;
	}

	for (const meta of withEffectPeers) {
		if (!isCompatible(meta.peerDependencies, resolved)) {
			const blockers: string[] = [];
			for (const [dep, range] of Object.entries(meta.peerDependencies)) {
				if (dep !== "effect" && !dep.startsWith("@effect/")) continue;
				const resolvedVersion = resolved.get(dep);
				if (resolvedVersion && !satisfiesRange(resolvedVersion, range)) {
					blockers.push(`${dep}@${range} (resolved: ${resolvedVersion})`);
				}
			}
			conflicts.push({
				name: meta.name,
				latest: meta.latest,
				compatibleVersion: resolved.get(meta.name) ?? null,
				requires: blockers.join(", "),
				reason: `Latest requires ${blockers.join(", ")} but resolved set has incompatible versions`,
			});
		}
	}

	const resolvedWithDeps = new Map<string, { version: string; peerDeps: Record<string, string> }>();
	for (const [name, version] of resolved) {
		const meta = metadata.get(name);
		resolvedWithDeps.set(name, {
			version,
			peerDeps: meta?.peerDependencies ?? {},
		});
	}
	return { effectVersion, resolved: resolvedWithDeps, conflicts };
}

// ── silkPeers derivation and output builder ────────────────────────────

function deriveSilkPeers(
	resolved: Map<string, { version: string; peerDeps: Record<string, string> }>,
): Map<string, string> {
	const floors = new Map<string, string[]>();
	for (const [, { peerDeps }] of resolved) {
		for (const [dep, range] of Object.entries(peerDeps)) {
			if (dep !== "effect" && !dep.startsWith("@effect/")) continue;
			if (!resolved.has(dep)) continue;
			const floor = extractFloor(range);
			const existing = floors.get(dep);
			if (existing) {
				existing.push(floor);
			} else {
				floors.set(dep, [floor]);
			}
		}
	}
	const silkPeers = new Map<string, string>();
	for (const [name, floorList] of floors) {
		const highest = floorList.sort(compareSemver).at(-1);
		if (highest) silkPeers.set(name, `>=${highest}`);
	}
	return silkPeers;
}

function buildOutput(
	resolved: ResolutionResult,
	currentSilk: Map<string, string>,
	currentSilkPeers: Map<string, string>,
	silkPeersMinimums: Map<string, string>,
	metadata: Map<string, PackageMetadata>,
): ResolverOutput {
	const tracked: TrackedEntry[] = [];
	const untracked: UntrackedEntry[] = [];
	const effectVersion = resolved.effectVersion;
	const currentEffectSilk = currentSilk.get("effect") ?? "";
	const resolvedEffectSilk = `^${effectVersion}`;
	const resolvedEffectSilkPeers = silkPeersMinimums.get("effect") ?? `^${effectVersion}`;
	const currentEffectSilkPeers = currentSilkPeers.get("effect") ?? "";

	if (currentSilk.has("effect")) {
		tracked.push({
			name: "effect",
			currentSilk: currentEffectSilk,
			resolvedSilk: resolvedEffectSilk,
			currentSilkPeers: currentEffectSilkPeers,
			resolvedSilkPeers: resolvedEffectSilkPeers,
			peerDeps: {},
			changed: currentEffectSilk !== resolvedEffectSilk || currentEffectSilkPeers !== resolvedEffectSilkPeers,
		});
	}

	for (const [name, { version, peerDeps }] of resolved.resolved) {
		if (name === "effect") continue;
		const rSilk = `^${version}`;
		const rSilkPeers = silkPeersMinimums.get(name) ?? `>=${version}`;
		if (currentSilk.has(name)) {
			const cSilk = currentSilk.get(name) ?? "";
			const cSilkPeers = currentSilkPeers.get(name) ?? "";
			tracked.push({
				name,
				currentSilk: cSilk,
				resolvedSilk: rSilk,
				currentSilkPeers: cSilkPeers,
				resolvedSilkPeers: rSilkPeers,
				peerDeps,
				changed: cSilk !== rSilk || cSilkPeers !== rSilkPeers,
			});
		} else {
			const meta = metadata.get(name);
			untracked.push({
				name,
				description: meta?.description ?? "",
				resolvedSilk: rSilk,
				resolvedSilkPeers: rSilkPeers,
				peerDeps,
			});
		}
	}
	tracked.sort((a, b) => a.name.localeCompare(b.name));
	untracked.sort((a, b) => a.name.localeCompare(b.name));
	return {
		effectCore: { current: currentEffectSilk, resolved: resolvedEffectSilk },
		tracked,
		untracked,
		conflicts: resolved.conflicts,
		error: null,
	};
}

// ── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const testMode = process.argv.includes("--test");

	try {
		const scriptDir = import.meta.dir;
		const rootDir = join(scriptDir, "../../../..");

		// Read current catalog
		const { silk: currentSilk, silkPeers: currentSilkPeers } = readCurrentCatalog(rootDir);
		if (testMode) {
			if (currentSilk.size === 0) fail("YAML test failed — no Effect entries in silk catalog");
			if (!currentSilk.has("effect")) fail("YAML test failed — effect not in silk");
			console.error(`YAML OK: ${currentSilk.size} silk entries, ${currentSilkPeers.size} silkPeers entries`);
		}

		// Discover packages
		const currentlyTracked = [...new Set([...currentSilk.keys(), ...currentSilkPeers.keys()])];
		const packageNames = await discoverPackages(currentlyTracked);
		if (testMode) {
			const knownPackages = ["effect", "@effect/cli", "@effect/platform", "@effect/platform-node"];
			const missing = knownPackages.filter((p) => !packageNames.includes(p));
			if (missing.length > 0) fail(`Discovery test failed — missing: ${missing.join(", ")}`);
			console.error(`Discovery OK: found ${packageNames.length} packages`);
		}

		// Fetch metadata
		console.error(`Fetching metadata for ${packageNames.length} packages...`);
		const metadata = await fetchAllMetadata(packageNames);
		if (testMode) {
			const effectMeta = metadata.get("effect");
			if (!effectMeta) fail("Metadata test failed — effect core not found");
			console.error(`Metadata OK: effect@${effectMeta.latest} with ${effectMeta.versions.length} stable versions`);
		}

		// Resolve versions
		const resolved = resolveVersions(metadata, packageNames);
		if (testMode) {
			console.error(
				`Resolution OK: effect@${resolved.effectVersion}, ${resolved.resolved.size} packages resolved, ${resolved.conflicts.length} conflicts`,
			);
		}

		// Derive silkPeers and build output
		const silkPeersMinimums = deriveSilkPeers(resolved.resolved);
		const output = buildOutput(resolved, currentSilk, currentSilkPeers, silkPeersMinimums, metadata);
		if (testMode) {
			console.error(
				`Output OK: ${output.tracked.length} tracked, ${output.untracked.length} untracked, ${output.conflicts.length} conflicts`,
			);
			console.error("\nAll tests passed!");
		}

		console.log(JSON.stringify(output, null, 2));
	} catch (err) {
		fail(err instanceof Error ? err.message : String(err));
	}
}

main();
