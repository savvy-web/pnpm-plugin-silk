# Effect Ecosystem Packages in Silk Catalogs

## Summary

Add 14 Effect ecosystem packages to both `silk` (pinned current) and `silkPeers`
(permissive ranges) catalogs in pnpm-plugin-silk. This centralizes Effect version
management across 15+ repos in the Savvy Web ecosystem, eliminating version drift
that causes peer dependency conflicts.

References: [GitHub Issue #73](https://github.com/savvy-web/pnpm-plugin-silk/issues/73)

## Context

### Problem

Effect ecosystem packages are used across 15 repos (savvy-web and spencerbeggs
orgs). Each repo independently manages version ranges, leading to:

- Version drift between repos (e.g., `effect` ranges from ^3.18.4 to ^3.20.0)
- Peer dependency conflicts when packages interact
- Manual effort to keep coordinated Effect releases in sync

### Audit Results

Repos audited: 30+ across savvy-web and spencerbeggs workspaces.

| Package | Repos Using | Latest Published |
| ------- | ----------- | ---------------- |
| `effect` | 15 | 3.20.0 |
| `@effect/platform` | 12 | 0.95.0 |
| `@effect/platform-node` | 11 | 0.105.0 |
| `@effect/cli` | 8 | 0.74.0 |
| `@effect/printer` | 2 | 0.48.0 |
| `@effect/printer-ansi` | 1 | 0.48.0 |
| `@effect/opentelemetry` | 1 | 0.62.0 |
| `@effect/platform-bun` | 1 | 0.88.0 |
| `@effect/typeclass` | 1 | 0.39.0 |
| `@effect/vitest` | 1 | 0.28.0 |
| `@effect/language-service` | 1 | 0.80.0 |
| `@effect/cluster` | 1 | 0.57.0 |
| `@effect/rpc` | 1 | 0.74.0 |
| `@effect/sql` | 1 | 0.50.0 |

### Excluded

- `@effect/schema` (v0.75.5) — zero repos use it; functionality merged into
  `effect` core.

## Design

### Catalog Ranges

**`silk`** — set to the latest published version with caret range:

| Package | silk Version |
| ------- | ------------ |
| `effect` | `^3.20.0` |
| `@effect/platform` | `^0.95.0` |
| `@effect/platform-node` | `^0.105.0` |
| `@effect/platform-bun` | `^0.88.0` |
| `@effect/cli` | `^0.74.0` |
| `@effect/opentelemetry` | `^0.62.0` |
| `@effect/printer` | `^0.48.0` |
| `@effect/printer-ansi` | `^0.48.0` |
| `@effect/typeclass` | `^0.39.0` |
| `@effect/vitest` | `^0.28.0` |
| `@effect/language-service` | `^0.80.0` |
| `@effect/cluster` | `^0.57.0` |
| `@effect/rpc` | `^0.74.0` |
| `@effect/sql` | `^0.50.0` |

**`silkPeers`** — floor-only ranges for peer dependency declarations:

| Package | silkPeers Version |
| ------- | ----------------- |
| `effect` | `^3.19.0` |
| `@effect/platform` | `>=0.94.0` |
| `@effect/platform-node` | `>=0.104.0` |
| `@effect/platform-bun` | `>=0.87.0` |
| `@effect/cli` | `>=0.73.0` |
| `@effect/opentelemetry` | `>=0.61.0` |
| `@effect/printer` | `>=0.47.0` |
| `@effect/printer-ansi` | `>=0.47.0` |
| `@effect/typeclass` | `>=0.38.0` |
| `@effect/vitest` | `>=0.27.0` |
| `@effect/language-service` | `>=0.79.0` |
| `@effect/cluster` | `>=0.56.0` |
| `@effect/rpc` | `>=0.73.0` |
| `@effect/sql` | `>=0.49.0` |

### Range Strategy

- **silk**: Uses `^latest` — allows patch updates within current minor. For 0.x
  packages, `^0.95.0` means `>=0.95.0 <0.96.0` (patch-only), which is appropriate
  since Effect treats each minor as a potentially breaking release.
- **silkPeers**: Uses `>=` floor ranges for 0.x `@effect/*` packages because caret
  ranges on 0.x versions (`^0.94.0` = `>=0.94.0 <0.95.0`) would not overlap with
  the `silk` version. The `>=` convention matches existing patterns in
  github-action-effects (e.g., `@effect/platform: >=0.94.0`). For `effect` itself
  (3.x), `^3.19.0` correctly includes 3.20.x, so caret is used.

### Coordinated Releases

Effect packages are released in coordinated batches — all packages in a release
share compatible versions. When updating silk catalogs, all 14 entries should be
updated together as a batch to maintain compatibility.

### Out of Scope

- **`peerDependencyRules.ignoreMissing`**: Not added globally. Repos that need to
  ignore `@effect/platform-node` transitive peers (`@effect/cluster`,
  `@effect/rpc`, `@effect/sql`) handle this locally.
- **`onlyBuiltDependencies`**: No Effect packages require build scripts.
- **`publicHoistPattern`**: No Effect packages need hoisting.

## Implementation

### Files Modified

1. `pnpm-workspace.yaml` — add 14 entries to `catalogs.silk` and `catalogs.silkPeers`
2. `src/catalogs/generated.ts` — auto-regenerated via `pnpm run generate:catalogs`

### Validation

1. Run `pnpm install` after updating workspace YAML to verify all ranges resolve
   without conflicts
2. Run `pnpm run generate:catalogs` to regenerate TypeScript
3. Run `pnpm run test` to confirm existing tests pass (update any tests that
   assert on catalog entry counts or specific keys)
4. Run `pnpm run build` to verify the generated bundle is correct

### Versioning

This is a minor version bump (new catalog entries, no breaking changes). A
changeset should accompany the PR.

### Ordering

Entries in `pnpm-workspace.yaml` should be alphabetically sorted within each
catalog section, consistent with existing entries.
