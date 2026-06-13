# Configuration

This document covers all configuration managed by `@savvy-web/pnpm-plugin-silk`.

## Catalogs

The plugin provides two named catalogs that merge into your `pnpm-workspace.yaml` during `pnpm install`.

### `catalog:silk`

Current/latest versions for direct dependencies. Use in `dependencies` and `devDependencies`:

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

The `silkPeers` catalog uses wider ranges so consuming packages do not force users to upgrade immediately.

## Effect ecosystem packages

The plugin manages 26 Effect ecosystem packages across both catalogs, organized into eight functional groups:

| Group | Packages |
| :---- | :------- |
| Core | `effect`, `@effect/platform`, `@effect/platform-node`, `@effect/platform-bun`, `@effect/platform-browser`, `@effect/platform-node-shared` |
| AI | `@effect/ai`, `@effect/ai-anthropic`, `@effect/ai-openai`, `@effect/ai-amazon-bedrock`, `@effect/ai-google` |
| CLI tooling | `@effect/cli`, `@effect/printer`, `@effect/printer-ansi` |
| Telemetry | `@effect/opentelemetry` |
| Foundational | `@effect/typeclass`, `@effect/language-service`, `@effect/experimental` |
| Database | `@effect/sql`, `@effect/sql-pg`, `@effect/sql-sqlite-bun`, `@effect/sql-sqlite-node` |
| Platform peers | `@effect/cluster`, `@effect/rpc`, `@effect/workflow` |
| Developer tooling | `@effect/vitest`, `@effect/tsgo` |

All Effect packages are updated together as a coordinated batch to maintain cross-package compatibility. The `effect-catalog-resolver` Claude Code skill automates this process by discovering 50+ `@effect/*` packages from npm, resolving peer dependency compatibility and proposing updates.

### Version ranges for 0.x Effect packages

For `@effect/*` packages (all currently at 0.x), the `silkPeers` catalog uses `>=` floor-only ranges instead of `^` caret ranges. This is necessary because `^0.x.y` in semver restricts updates to patch-only (`>=0.x.y <0.(x+1).0`), which would not overlap with the `silk` pinned version one minor version ahead.

For `effect` itself (currently at 3.x), the standard `^` caret range works correctly.

### Excluded Effect packages

One Effect package is intentionally excluded:

- **`@effect/schema`** - Functionality merged into `effect` core

## Security overrides

The plugin injects pnpm `overrides` for known CVEs in transitive dependencies. These ensure all consuming repositories receive security fixes without manual intervention.

Current overrides:

| Package | Minimum Version | Advisory |
| :------ | :-------------- | :------- |
| `@isaacs/brace-expansion` | `^5.0.1` | CVE-2026-25547 |
| `lodash` | `^4.17.23` | CVE-2025-13465 |
| `markdown-it` | `^14.1.1` | Security fix |
| `minimatch` | `>=10.2.3` | Security fix |
| `smol-toml` | `>=1.6.1` | Security fix |
| `tmp` | `^0.2.4` | GHSA-52f5-9888-hmc6 |

## Build configuration

### `allowBuilds`

pnpm 11 replaced `onlyBuiltDependencies` with `allowBuilds`, a map from package name to `true`. The plugin merges a curated allowlist of packages that may run install scripts — covering packages with native binaries such as `esbuild`, `better-sqlite3` and `@parcel/watcher`. Child repos can extend this list per-key; they cannot remove a Silk-managed entry without triggering a security warning.

### `publicHoistPattern`

The plugin provides a list of packages that should be hoisted to the virtual store root. This is needed for tools like `typescript`, `turbo` and `husky` that expect to be accessible from the project root.

## Security settings

The plugin enforces three security defaults that child repos may relax, but doing so triggers a warning box during `pnpm install`.

### `strictDepBuilds`

When `true` (the default), pnpm refuses to run build scripts for any package not listed in `allowBuilds`. Adding a package to your local `allowBuilds` is the correct way to opt in; setting `strictDepBuilds: false` disables the guard entirely and produces a warning.

### `blockExoticSubdeps`

When `true` (the default), pnpm blocks transitive dependencies resolved from non-registry sources (git URLs, file paths, tarballs). Setting `blockExoticSubdeps: false` in a child config triggers a warning.

### `minimumReleaseAge`

The plugin sets `minimumReleaseAge: 1440` (minutes), meaning pnpm will not install a package version published in the last 24 hours. This defends against dependency confusion and publish-time supply-chain attacks. You can raise this value (stricter) without a warning; lowering it below the Silk default triggers a warning.

`minimumReleaseAgeExclude` is an array that unions with the Silk default excludes — first-party scopes (`@savvy-web/*`) are always excluded.

## Behavioral defaults

The plugin also injects plain behavioral defaults. These share the child-wins-else-Silk merge mechanic with the security scalars above, but they are not a security posture, so a diverging child value wins silently with no warning.

### `confirmModulesPurge`

Silk sets `confirmModulesPurge: false` so pnpm reinstalls a corrupted or out-of-date `node_modules` without an interactive confirmation prompt — useful in CI and scripted workflows. Setting `confirmModulesPurge: true` in your child config restores the prompt; unlike the security defaults, overriding this value does not trigger a warning.

## Additional inherited settings

The following settings merge into child workspaces using the same non-destructive strategy (child-wins per key for maps, union for arrays):

| Setting | Merge type | Purpose |
| :------ | :--------- | :------ |
| `packageExtensions` | Map (child-wins per key) | Add fields to third-party package manifests |
| `allowedDeprecatedVersions` | Map (child-wins per key) | Suppress specific deprecation warnings |
| `supportedArchitectures` | Array union | Control which native binaries pnpm installs |
| `auditConfig` | Array union | Configure `pnpm audit` ignore rules |

## Local overrides

You can override any catalog entry or pnpm override locally. Add the entry to your `pnpm-workspace.yaml` and the local value takes precedence:

```yaml
catalogs:
  silk:
    typescript: "^5.8.0"  # Override Silk's version
```

When local entries diverge from Silk-managed versions, the plugin prints a warning during `pnpm install` so the override is visible and intentional. To revert to Silk defaults, remove the local entry from your `pnpm-workspace.yaml`.
