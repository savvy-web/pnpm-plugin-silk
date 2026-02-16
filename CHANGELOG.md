# @savvy-web/pnpm-plugin-silk

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
