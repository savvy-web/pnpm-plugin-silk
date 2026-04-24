---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

- Added `peerDependencyRules` sync: the plugin now merges `allowedVersions`, `ignoreMissing`, and `allowAny` from the Silk workspace into consuming workspaces using the same merge-and-warn pattern as catalogs and overrides. Local values take precedence; any local entry that diverges from the Silk-provided value emits a console warning at install time.
- Added `SilkPeerDependencyRules` type to the public API, representing the shape of the synced peer dependency rules.

## Refactoring

- Rewrote hook internals as Effect programs. `updateConfig` now returns `Effect<PnpmConfig, never, CatalogProvider | PeerDependencyRulesProvider>`, and the generation script uses an Effect program with a `FileSystem` service. The `pnpmfile.ts` entry point runs the Effect and returns the resolved config, so the pnpm hook signature is unchanged.
- Reorganized tests from `src/index.test.ts` into a structured `__test__/` directory with per-module unit test files and dedicated integration tests, growing coverage from 27 to 54 tests.
- Extracted merge logic into focused modules: `merge-arrays.ts`, `merge-catalogs.ts`, `merge-overrides.ts`, and `merge-peer-dependency-rules.ts`.
