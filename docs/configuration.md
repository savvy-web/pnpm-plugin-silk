# Configuration

This document covers all configuration managed by `@savvy-web/pnpm-plugin-silk`.

## Catalogs

The plugin provides two named catalogs that merge into your
`pnpm-workspace.yaml` during `pnpm install`.

### `catalog:silk`

Current/latest versions for direct dependencies. Use in `dependencies` and
`devDependencies`:

```json
{
  "devDependencies": {
    "typescript": "catalog:silk",
    "vitest": "catalog:silk",
    "@biomejs/biome": "catalog:silk"
  }
}
```

### `catalog:silkPeers`

Permissive version ranges for peer dependencies. Use in `peerDependencies`:

```json
{
  "peerDependencies": {
    "typescript": "catalog:silkPeers"
  }
}
```

The `silkPeers` catalog uses wider ranges so consuming packages do not force
users to upgrade immediately.

## Effect Ecosystem Packages

The plugin manages 24 Effect ecosystem packages across both catalogs, organized
into seven functional groups:

| Group | Packages |
| :---- | :------- |
| Core | `effect`, `@effect/platform`, `@effect/platform-node`, `@effect/platform-bun`, `@effect/platform-browser`, `@effect/platform-node-shared` |
| AI | `@effect/ai`, `@effect/ai-anthropic`, `@effect/ai-openai`, `@effect/ai-amazon-bedrock`, `@effect/ai-google` |
| CLI Tooling | `@effect/cli`, `@effect/printer`, `@effect/printer-ansi` |
| Telemetry | `@effect/opentelemetry` |
| Foundational | `@effect/typeclass`, `@effect/language-service`, `@effect/experimental` |
| Database | `@effect/sql`, `@effect/sql-pg`, `@effect/sql-sqlite-bun`, `@effect/sql-sqlite-node` |
| Platform Peers | `@effect/cluster`, `@effect/rpc`, `@effect/workflow` |

All Effect packages are updated together as a coordinated batch to maintain
cross-package compatibility. The `effect-catalog-resolver` Claude Code skill
automates this process by discovering 50+ `@effect/*` packages from npm,
resolving peer dependency compatibility, and proposing updates.

### Version ranges for 0.x Effect packages

For `@effect/*` packages (all currently at 0.x), the `silkPeers` catalog uses
`>=` floor-only ranges instead of `^` caret ranges. This is necessary because
`^0.x.y` in semver restricts updates to patch-only (`>=0.x.y <0.(x+1).0`),
which would not overlap with the `silk` pinned version one minor version ahead.

For `effect` itself (currently at 3.x), the standard `^` caret range works
correctly.

### Excluded Effect packages

Two Effect packages are intentionally excluded:

- **`@effect/vitest`** - Test runner versions are managed per-repository
- **`@effect/schema`** - Functionality merged into `effect` core

## Security Overrides

The plugin injects pnpm `overrides` for known CVEs in transitive dependencies.
These ensure all consuming repositories receive security fixes without manual
intervention.

Current overrides:

| Package | Minimum Version | Advisory |
| :------ | :-------------- | :------- |
| `@isaacs/brace-expansion` | `^5.0.1` | CVE-2026-25547 |
| `lodash` | `^4.17.23` | CVE-2025-13465 |
| `markdown-it` | `^14.1.1` | Security fix |
| `minimatch` | `>=10.2.3` | Security fix |
| `smol-toml` | `>=1.6.1` | Security fix |
| `tmp` | `^0.2.4` | GHSA-52f5-9888-hmc6 |

## Build Configuration

### `onlyBuiltDependencies`

The plugin merges a curated list of packages that are allowed to run build
scripts during `pnpm install`. This prevents unexpected build scripts from
running while ensuring packages with native binaries build correctly.

### `publicHoistPattern`

The plugin provides a list of packages that should be hoisted to the virtual
store root. This is needed for tools like `typescript`, `turbo`, and `husky`
that expect to be accessible from the project root.

## Local Overrides

You can override any catalog entry or pnpm override locally. Add the entry to
your `pnpm-workspace.yaml` and the local value takes precedence:

```yaml
catalogs:
  silk:
    typescript: "^5.8.0"  # Override Silk's version
```

When local entries diverge from Silk-managed versions, the plugin prints a
warning during `pnpm install` so the override is visible and intentional.

To revert to Silk defaults, remove the local entry from your
`pnpm-workspace.yaml`.
