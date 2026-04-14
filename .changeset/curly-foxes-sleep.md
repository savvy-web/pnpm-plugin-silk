---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

- Added `@effect/ai-amazon-bedrock` and `@effect/ai-google` to both `silk` and `silkPeers` catalogs.
- Added missing `silkPeers` entries for `@effect/platform-browser`, `@effect/platform-node-shared`, `@effect/sql-pg`, `@effect/sql-sqlite-bun`, and `@effect/vitest`.
- Bumped `@effect/language-service` to `^0.85.1` in both catalogs.
- Added `react`, `react-dom`, `@types/react`, and `@types/react-dom` to both `silk` and `silkPeers` catalogs.
- Updated `typescript` in `silk` to `^6.0.2` and in `silkPeers` to `^6.0.0`, adding TypeScript 6 support.

## Breaking Changes

- Removed the `syncBiomeSchema` hook. This hook previously auto-updated `$schema` URLs in `biome.json`/`biome.jsonc` files on install. This functionality has migrated to `@savvy-web/lint-staged` — no action is needed if you are already using that package.
- Removed bundled `jsonc-parser` and `parse-gitignore` dependencies. The plugin bundle size is reduced as a result.

### Migration

If your project relied on Silk to keep Biome schema URLs current, install or update `@savvy-web/lint-staged`, which now owns that responsibility.

## Maintenance

- The `updateConfig` hook in `pnpmfile.ts` is now synchronous, removing unnecessary `async`/`await` overhead.
