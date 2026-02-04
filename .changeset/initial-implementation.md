---
"@savvy-web/pnpm-plugin-silk": minor
---

Initial implementation of pnpm config dependency for centralized catalog management.

**Features:**
- `catalog:silk` - Current/latest versions for direct dependencies
- `catalog:silkPeers` - Permissive ranges for peerDependencies
- Override warnings with prominent console output when local versions diverge from Silk defaults
- Auto-generation of catalogs from `pnpm-workspace.yaml` via `scripts/generate-catalogs.ts`

**Technical:**
- Self-contained CommonJS bundle (`pnpmfile.cjs`) via rslib-builder virtualEntries
- 15 unit tests covering catalog merging, override detection, and warning formatting
- Full TSDoc documentation with `@public` and `@internal` visibility tags
