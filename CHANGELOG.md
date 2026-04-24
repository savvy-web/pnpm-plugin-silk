# @savvy-web/pnpm-plugin-silk

## 0.13.0

### Features

* [`3b9b09e`](https://github.com/savvy-web/pnpm-plugin-silk/commit/3b9b09e9a6350dc68882c8bd6cd1bad3a040bec6) Added `peerDependencyRules` sync: the plugin now merges `allowedVersions`, `ignoreMissing`, and `allowAny` from the Silk workspace into consuming workspaces using the same merge-and-warn pattern as catalogs and overrides. Local values take precedence; any local entry that diverges from the Silk-provided value emits a console warning at install time.
* Added `SilkPeerDependencyRules` type to the public API, representing the shape of the synced peer dependency rules.

### Refactoring

* [`3b9b09e`](https://github.com/savvy-web/pnpm-plugin-silk/commit/3b9b09e9a6350dc68882c8bd6cd1bad3a040bec6) Rewrote hook internals as Effect programs. `updateConfig` now returns `Effect<PnpmConfig, never, CatalogProvider | PeerDependencyRulesProvider>`, and the generation script uses an Effect program with a `FileSystem` service. The `pnpmfile.ts` entry point runs the Effect and returns the resolved config, so the pnpm hook signature is unchanged.
* Reorganized tests from `src/index.test.ts` into a structured `__test__/` directory with per-module unit test files and dedicated integration tests, growing coverage from 27 to 54 tests.
* Extracted merge logic into focused modules: `merge-arrays.ts`, `merge-catalogs.ts`, `merge-overrides.ts`, and `merge-peer-dependency-rules.ts`.

## 0.12.1

### Bug Fixes

* [`97d9bfd`](https://github.com/savvy-web/pnpm-plugin-silk/commit/97d9bfd36102a6fc1282c0afb25c9e50df9ad4e6) Corrects the Effect catalog resolver's `deriveSilkPeers` function to use the lowest peer dependency floor instead of the highest. Previously, silkPeers ranges converged to match silk values, defeating the purpose of permissive peer ranges.

### Dependencies

* | [`97d9bfd`](https://github.com/savvy-web/pnpm-plugin-silk/commit/97d9bfd36102a6fc1282c0afb25c9e50df9ad4e6) | Dependency    | Type    | Action                | From                 | To |
  | :--------------------------------------------------------------------------------------------------------- | :------------ | :------ | :-------------------- | :------------------- | -- |
  | effect                                                                                                     | devDependency | updated | ^3.21.0               | ^3.21.2              |    |
  | @effect/ai-openai                                                                                          | devDependency | updated | ^0.39.0               | ^0.39.2              |    |
  | @effect/cli                                                                                                | devDependency | updated | ^0.75.0               | ^0.75.1              |    |
  | @effect/cluster                                                                                            | devDependency | updated | ^0.58.0               | ^0.58.2              |    |
  | @effect/platform                                                                                           | devDependency | updated | ^0.96.0               | ^0.96.1              |    |
  | @effect/rpc                                                                                                | devDependency | updated | ^0.75.0               | ^0.75.1              |    |
  | @effect/sql                                                                                                | devDependency | updated | ^0.51.0               | ^0.51.1              |    |
  | @typescript/native-preview                                                                                 | devDependency | updated | ^7.0.0-dev.20260414.1 | 7.0.0-dev.20260422.1 |    |
  | typescript                                                                                                 | devDependency | updated | ^6.0.2                | ^6.0.3               |    |

## 0.12.0

### Breaking Changes

* [`5dce523`](https://github.com/savvy-web/pnpm-plugin-silk/commit/5dce5230a2215c3013430ec9a2703f13a2c0ccd1) Removed the `syncBiomeSchema` hook. This hook previously auto-updated `$schema` URLs in `biome.json`/`biome.jsonc` files on install. This functionality has migrated to `@savvy-web/lint-staged` — no action is needed if you are already using that package.
* Removed bundled `jsonc-parser` and `parse-gitignore` dependencies. The plugin bundle size is reduced as a result.

### Features

* [`5dce523`](https://github.com/savvy-web/pnpm-plugin-silk/commit/5dce5230a2215c3013430ec9a2703f13a2c0ccd1) Added `@effect/ai-amazon-bedrock` and `@effect/ai-google` to both `silk` and `silkPeers` catalogs.
* Added missing `silkPeers` entries for `@effect/platform-browser`, `@effect/platform-node-shared`, `@effect/sql-pg`, `@effect/sql-sqlite-bun`, and `@effect/vitest`.
* Bumped `@effect/language-service` to `^0.85.1` in both catalogs.
* Added `react`, `react-dom`, `@types/react`, and `@types/react-dom` to both `silk` and `silkPeers` catalogs.
* Updated `typescript` in `silk` to `^6.0.2` and in `silkPeers` to `^6.0.0`, adding TypeScript 6 support.

### Maintenance

* [`5dce523`](https://github.com/savvy-web/pnpm-plugin-silk/commit/5dce5230a2215c3013430ec9a2703f13a2c0ccd1) The `updateConfig` hook in `pnpmfile.ts` is now synchronous, removing unnecessary `async`/`await` overhead.

### Migration

If your project relied on Silk to keep Biome schema URLs current, install or update `@savvy-web/lint-staged`, which now owns that responsibility.

## 0.11.0

### Features

* [`7873adc`](https://github.com/savvy-web/pnpm-plugin-silk/commit/7873adc4d0d04e4001483a1d3626998ebe128fa6) Adds smol-toml override to resolve security warnings

## 0.10.1

### Bug Fixes

* [`2aed0d1`](https://github.com/savvy-web/pnpm-plugin-silk/commit/2aed0d1aee9068cf35014bc6309bccc919329ba9) Reverts to distributing Biome version through config dependency system

## 0.10.0

### Features

* [`438b13a`](https://github.com/savvy-web/pnpm-plugin-silk/commit/438b13a1ae7e5338c1b112f3ffb17e9bc9d6a807) Add effect-catalog-resolver skill and expand Effect ecosystem to 19 packages.

New Claude Code skill (`.claude/skills/effect-catalog-resolver/`) that discovers
all `@effect/*` packages from the npm registry, resolves the latest compatible
version set using peer dependency analysis, and proposes updates to
`pnpm-workspace.yaml` catalogs.

New tracked packages: `@effect/ai`, `@effect/ai-anthropic`, `@effect/ai-openai`,
`@effect/experimental`, `@effect/workflow`, `@effect/sql-sqlite-node`. All Effect
packages updated to latest compatible versions anchored on `effect@3.21.0`.

## 0.9.0

### Features

* [`271ad35`](https://github.com/savvy-web/pnpm-plugin-silk/commit/271ad35e1074ece2a1c4ef8b8dd1d67e02453064) Add 13 Effect ecosystem packages to silk and silkPeers catalogs for centralized
  version management: effect, @effect/platform, @effect/platform-node,
  @effect/platform-bun, @effect/cli, @effect/opentelemetry, @effect/printer,
  @effect/printer-ansi, @effect/typeclass, @effect/language-service,
  @effect/cluster, @effect/rpc, @effect/sql.

silkPeers uses >= floor ranges for 0.x @effect/\* packages to correctly handle
semver caret behavior on pre-1.0 versions.

## 0.8.0

### Features

* [`44c4642`](https://github.com/savvy-web/pnpm-plugin-silk/commit/44c46429c2539dfc8b73d28f51f0bfe489f9506a) Reverts contol of most peerDependencies to companion packages

- [`f8ad907`](https://github.com/savvy-web/pnpm-plugin-silk/commit/f8ad9074ed4cd67287351d77974775331ed55c75) Reverts control of vitest and linting peerDependencies to their compantion packages

## 0.7.0

### Features

* [`cc6dc9e`](https://github.com/savvy-web/pnpm-plugin-silk/commit/cc6dc9e9348e8ada416ff35ed8525f83b391bbd1) Changes control of Biome, changesets and commitlint peerDependencies to their respective modules

## 0.6.3

### Bug Fixes

* [`89ee553`](https://github.com/savvy-web/pnpm-plugin-silk/commit/89ee5535403b9927264a4a57dd90b20a269df2c5) pins @microsoft/api-extractor catalog versions temporarily to prevent [extentionless ESM exports regression](https://github.com/microsoft/rushstack/issues/5644)

## 0.6.2

### Bug Fixes

* [`fe6d481`](https://github.com/savvy-web/pnpm-plugin-silk/commit/fe6d481090c0db429508c6a262a2b55d3ac03160) Hoist @types/node, commitizen, tsx

## 0.6.1

### Bug Fixes

* [`f082d2e`](https://github.com/savvy-web/pnpm-plugin-silk/commit/f082d2eaf4d481210973743d1bba3558651f3552) Sets reasonalbe peers for all dependencies

## 0.6.0

### Features

* [`0303f9a`](https://github.com/savvy-web/pnpm-plugin-silk/commit/0303f9aada1e48b00b6e44cf68c055d631edd9c6) Allows @savvy-web/vitest into onlyBuiltDependencies
* Allows @savvy-web/github-action-builder into onlyBuiltDependencies

## 0.5.3

### Dependencies

* [`4c4a2b7`](https://github.com/savvy-web/pnpm-plugin-silk/commit/4c4a2b7eb5f7b335e729b553304a4c96eee31343) Updates Biome to 2.4.1

## 0.5.2

### Dependencies

* [`4b734d8`](https://github.com/savvy-web/pnpm-plugin-silk/commit/4b734d83f113870588f4eb9ffd155155e2fe1635) Security override for markdown-it vulnerability

## 0.5.1

### Bug Fixes

* [`2773064`](https://github.com/savvy-web/pnpm-plugin-silk/commit/27730644f346e81fdf5588240ac83f0c346c11da) Bundle jsonc-parser

## 0.5.0

### Features

* [`6b28769`](https://github.com/savvy-web/pnpm-plugin-silk/commit/6b28769a17b28559d3647cab3618a704af24dd54) Support for @savvy-web/changesets system

## 0.4.4

### Patch Changes

* caa4d48: Update dependencies:

  **Dependencies:**

  * @savvy-web/commitlint: ^0.3.1 → ^0.3.2
  * @savvy-web/rslib-builder: ^0.12.1 → ^0.12.2

## 0.4.3

### Patch Changes

* f07b189: Updates dependencies

## 0.4.2

### Patch Changes

* d84cdb4: Update dependencies

## 0.4.1

### Patch Changes

* 2fa447f: Updates dependencies

## 0.4.0

### Minor Changes

* 2db03cc: Add automatic Biome schema version synchronization

  When `@savvy-web/lint-staged` is a workspace dependency, the plugin now
  automatically updates `$schema` URLs in `biome.json`/`biome.jsonc` files to
  match the catalog version of `@biomejs/biome`. Uses comment-preserving JSONC
  edits via `jsonc-parser` and respects `.gitignore` patterns when searching for
  config files via Node's built-in `fs.promises.glob`.

### Patch Changes

* 2db03cc: Updates dependencies

## 0.3.0

### Minor Changes

* 88c97f4: Adds onlyBuiltDependencies and publicHoistPatterns support

## 0.2.0

### Minor Changes

* 18a0a3d: Add security override support for transitive dependency CVEs
  * Added `silkOverrides` to sync pnpm `overrides` configuration across consuming repos
  * Security fixes included: `@isaacs/brace-expansion` (CVE-2026-25547), `lodash` (CVE-2025-13465), `tmp` (GHSA-52f5-9888-hmc6)
  * Override warnings alert when local overrides diverge from Silk-managed versions
  * Updated generator to read overrides from `pnpm-workspace.yaml`

## 0.1.0

### Minor Changes

* f849d68: Initial implementation of pnpm config dependency for centralized catalog management.

  **Features:**

  * `catalog:silk` - Current/latest versions for direct dependencies
  * `catalog:silkPeers` - Permissive ranges for peerDependencies
  * Override warnings with prominent console output when local versions diverge from Silk defaults
  * Auto-generation of catalogs from `pnpm-workspace.yaml` via `scripts/generate-catalogs.ts`

  **Technical:**

  * Self-contained CommonJS bundle (`pnpmfile.cjs`) via rslib-builder virtualEntries
  * 15 unit tests covering catalog merging, override detection, and warning formatting
  * Full TSDoc documentation with `@public` and `@internal` visibility tags
