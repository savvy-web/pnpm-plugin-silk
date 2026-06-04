# How it works

This document explains how `@savvy-web/pnpm-plugin-silk` integrates with pnpm to deliver centralized dependency management.

## pnpm config dependencies

The plugin is a [pnpm config dependency](https://pnpm.io/config-dependencies). Config dependencies are special packages that pnpm installs before all other dependencies and loads as [pnpmfile hooks](https://pnpm.io/pnpmfile).

When you run `pnpm install`:

1. pnpm installs config dependencies first
2. pnpm loads `pnpmfile.mjs` from each config dependency
3. pnpm calls the `updateConfig` hook with the current workspace configuration
4. The hook returns a modified configuration that pnpm uses for resolution

## Merge strategy

The plugin uses a **non-destructive merge** strategy. For catalogs and overrides, it spreads the plugin values first, then overlays local values:

```text
merged = { ...silkCatalog, ...localCatalog }
```

This means:

- Silk-provided entries are the defaults
- Local entries always win conflicts
- Entries only in Silk are added
- Entries only in local are preserved

Settings fall into three merge categories:

- **Maps** merge child-wins per key: catalogs, `overrides`, `allowBuilds`, `packageExtensions`, `allowedDeprecatedVersions`.
- **Scalars** take the child value if set, otherwise the Silk default: `strictDepBuilds`, `blockExoticSubdeps`, `minimumReleaseAge`.
- **Arrays** union and deduplicate: `publicHoistPattern`, `minimumReleaseAgeExclude` and each axis of `supportedArchitectures` and `auditConfig`.

When a child config weakens a Silk security default — enabling a build that Silk blocked, disabling `strictDepBuilds` or `blockExoticSubdeps`, or lowering `minimumReleaseAge` — the plugin prints a prominent security warning box.

## Override warnings

When a local entry conflicts with a Silk-managed version, the plugin prints a prominent warning box during `pnpm install`:

```text
+-------------------------------------------------------------------------+
|  SILK CATALOG OVERRIDE DETECTED                                         |
+-------------------------------------------------------------------------+
|  catalogs.silk.typescript                                               |
|    Silk version:   ^5.9.3                                               |
|    Local override: ^5.8.0                                               |
|                                                                         |
|  Local versions will be used. To use Silk defaults, remove these        |
|  entries from your pnpm-workspace.yaml catalogs section.                |
+-------------------------------------------------------------------------+
```

This ensures overrides are intentional and visible to the entire team.

## Catalog generation

The plugin's catalog data is generated from `pnpm-workspace.yaml` at build time via `lib/scripts/run-generate.ts`. The generator reads:

- `catalogs.silk` — Direct dependency versions
- `catalogs.silkPeers` — Peer dependency ranges
- `overrides` — Security overrides
- `allowBuilds` — Build script allowlist (pnpm 11)
- `publicHoistPattern` — Hoist patterns
- `strictDepBuilds`, `blockExoticSubdeps`, `minimumReleaseAge` — Security defaults

This data is written to `src/catalogs/generated.ts` and bundled into the self-contained `pnpmfile.mjs` output.

## Bundle architecture

The published package includes `pnpmfile.mjs` and `pnpmfile.cjs` files that contain all catalog data and hook logic. This is necessary because pnpm config dependencies cannot have their own runtime dependencies — everything must be bundled.

The bundle is built with [tsdown](https://tsdown.dev) from the same TypeScript source, producing self-contained ESM (`pnpmfile.mjs`) and CommonJS (`pnpmfile.cjs`) bundles. Both ship because pnpm 11.5.1 resolves config-dependency pnpmfiles through two different code paths: `pnpm install` uses an mjs-aware resolver that prefers `pnpmfile.mjs`, while the lifecycle path (`pnpm run`/`pnpm exec`, which Turbo invokes) uses a legacy resolver that probes only `pnpmfile.cjs`. Shipping both keeps the plugin working under either path.

## Effect ecosystem version resolution

The plugin manages 26 Effect ecosystem packages that are released in coordinated batches. All packages in a release share compatible versions, so the silk catalogs update all 26 entries together as a single batch.

The `effect-catalog-resolver` Claude Code skill (`/effect-catalog-resolver`) automates this process:

1. **Discovery** — Queries the npm registry to find all `@effect/*` packages (50+ total)
2. **Metadata fetch** — Retrieves per-version peer dependency data for each package
3. **Version resolution** — Anchors on the latest `effect` core release and iteratively resolves compatible versions for all tracked packages
4. **Proposal** — Compares resolved versions against current catalog entries and presents a report with updates, new packages and any conflicts

The resolver uses a deterministic script-driven approach rather than LLM reasoning, because version compatibility is a constraint-satisfaction problem best solved algorithmically.

## Error handling

The plugin is designed to never break `pnpm install`:

- If catalog merging fails, the original config is returned unchanged
- All hook exceptions are caught at the top level with fail-safe fallbacks
