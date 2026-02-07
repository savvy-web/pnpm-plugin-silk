# How It Works

This document explains how `@savvy-web/pnpm-plugin-silk` integrates with pnpm
to deliver centralized dependency management.

## pnpm Config Dependencies

The plugin is a [pnpm config dependency](https://pnpm.io/config-dependencies).
Config dependencies are special packages that pnpm installs before all other
dependencies and loads as [pnpmfile hooks](https://pnpm.io/pnpmfile).

When you run `pnpm install`:

1. pnpm installs config dependencies first
2. pnpm loads `pnpmfile.cjs` from each config dependency
3. pnpm calls the `updateConfig` hook with the current workspace configuration
4. The hook returns a modified configuration that pnpm uses for resolution

## Merge Strategy

The plugin uses a **non-destructive merge** strategy. For catalogs and
overrides, it spreads the plugin values first, then overlays local values:

```text
merged = { ...silkCatalog, ...localCatalog }
```

This means:

- Silk-provided entries are the defaults
- Local entries always win conflicts
- Entries only in Silk are added
- Entries only in local are preserved

For array fields (`onlyBuiltDependencies`, `publicHoistPattern`), the plugin
combines both arrays and removes duplicates.

## Override Warnings

When a local entry conflicts with a Silk-managed version, the plugin prints
a prominent warning box during `pnpm install`:

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

## Catalog Generation

The plugin's catalog data is generated from `pnpm-workspace.yaml` at build
time via `scripts/generate-catalogs.ts`. The generator reads:

- `catalogs.silk` - Direct dependency versions
- `catalogs.silkPeers` - Peer dependency ranges
- `overrides` - Security overrides
- `onlyBuiltDependencies` - Build script allowlist
- `publicHoistPattern` - Hoist patterns

This data is written to `src/catalogs/generated.ts` and bundled into the
self-contained `pnpmfile.cjs` output.

## Bundle Architecture

The published package includes a single `pnpmfile.cjs` file that contains all
catalog data and hook logic. This is necessary because pnpm config dependencies
cannot have their own runtime dependencies -- everything must be bundled.

The bundle is built with [rslib-builder](https://github.com/savvy-web/pnpm-module-template)
using the `virtualEntries` feature to produce a CommonJS output from ESM
TypeScript source.

## Error Handling

The plugin is designed to never break `pnpm install`:

- If catalog merging fails, the original config is returned unchanged
- If Biome schema sync fails, a warning is logged but install continues
- All hook exceptions are caught at the top level with fail-safe fallbacks
