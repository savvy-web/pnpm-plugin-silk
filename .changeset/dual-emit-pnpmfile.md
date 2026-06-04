---
"@savvy-web/pnpm-plugin-silk": patch
---

## Bug Fixes

The published config dependency now loads under `pnpm run` / `pnpm exec`, not just `pnpm install`.

pnpm 11.5.1 resolves config-dependency pnpmfiles through two different code paths. The install path is mjs-aware and prefers `pnpmfile.mjs`, but the lifecycle path that backs `pnpm run` and `pnpm exec` (what Turbo invokes) uses a legacy resolver that probes only `pnpmfile.cjs`. Since 0.14.x shipped `pnpmfile.mjs` alone, consuming repos installed cleanly but failed any `pnpm run`-driven build with `ERR_PNPM ... pnpmfile.cjs is not found`.

The build now emits both a self-contained ESM `pnpmfile.mjs` and a real CommonJS `pnpmfile.cjs` (not a shim that re-imports the mjs — pnpm reads `hooks` synchronously at load), both built from the same source so they stay behaviorally identical. The install path keeps using the `.mjs`; the lifecycle path now finds the `.cjs`.

* `tsdown` emits both `esm` and `cjs` formats
* both `pnpmfile.cjs` and `pnpmfile.mjs` are listed in the published `files`
