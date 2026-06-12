---
"@savvy-web/pnpm-plugin-silk": patch
---

## Maintenance

Updated Effect ecosystem catalog entries (`catalog:silk` and `catalog:silkPeers`) to the latest compatible releases. Consumer repos that reference `catalog:silk` entries will receive these pinned ranges on their next `pnpm install` after upgrading this plugin.

Notable bumps:

- `effect` ^3.21.2 → ^3.21.3
- `@effect/cluster` ^0.58.2 → ^0.59.0
- `@effect/platform-node` ^0.106.0 → ^0.107.0
- `@effect/platform-node-shared` ^0.59.0 → ^0.60.0
- `@effect/platform-bun` ^0.89.0 → ^0.90.0
- `@effect/ai` / `@effect/ai-*` family ^0.35.x → ^0.36.x
- `@effect/cli` ^0.75.1 → ^0.75.2
- `@effect/rpc` ^0.75.0 → ^0.75.1 (silkPeers floor)
- `@effect/sql-clickhouse` ^0.48.0 → ^0.49.0
- `@effect/tsgo` ^0.13.1 → ^0.14.3
- `@effect/workflow` ^0.18.1 → ^0.18.2

## Build System

Migrated build tooling from `tsdown` to `@savvy-web/bundler`. The published bundle (`pnpmfile.mjs` / `pnpmfile.cjs`) is functionally unchanged; only internal build configuration and output directory layout were updated.
