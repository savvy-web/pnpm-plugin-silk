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

## Security Overrides

The plugin injects pnpm `overrides` for known CVEs in transitive dependencies.
These ensure all consuming repositories receive security fixes without manual
intervention.

Current overrides:

| Package | Minimum Version | Advisory |
| :------ | :-------------- | :------- |
| `@isaacs/brace-expansion` | `>=5.0.1` | CVE-2026-25547 |
| `lodash` | `>=4.17.23` | CVE-2025-13465 |
| `tmp` | `>=0.2.4` | GHSA-52f5-9888-hmc6 |

## Build Configuration

### `onlyBuiltDependencies`

The plugin merges a curated list of packages that are allowed to run build
scripts during `pnpm install`. This prevents unexpected build scripts from
running while ensuring packages with native binaries build correctly.

### `publicHoistPattern`

The plugin provides a list of packages that should be hoisted to the virtual
store root. This is needed for tools like `typescript`, `turbo`, and `husky`
that expect to be accessible from the project root.

## Biome Schema Sync

When a consuming repository uses `@savvy-web/lint-staged` and has
`biome.json` or `biome.jsonc` config files, the plugin automatically updates
the `$schema` URL to match the Biome version in the silk catalog. This keeps
IDE autocompletion and validation in sync with the installed Biome version.

The sync is:

- **Conditional** - Only activates when `@savvy-web/lint-staged` is a dependency
- **Gitignore-aware** - Skips config files in ignored directories
- **Comment-preserving** - Uses JSONC-aware editing to preserve comments and
  formatting
- **Safe** - Errors are logged but never break `pnpm install`

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
