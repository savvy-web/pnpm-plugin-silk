---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

### pnpm 11 Support

The published artifact is now a self-contained ESM module (`pnpmfile.mjs`) built
with tsdown. pnpm 11 loads config dependencies as native ESM, and this release
aligns the plugin with that requirement.

### `allowBuilds` Replaces `onlyBuiltDependencies`

The deprecated pnpm 10 `onlyBuiltDependencies` setting is replaced by pnpm 11's
`allowBuilds` map. The silk catalog now ships a curated `silkAllowBuilds` map
(package matcher → boolean) that child configs can extend key-by-key (child wins
per key).

```yaml
# .npmrc / pnpm config in child repo — these keys merge on top of silk defaults
allowBuilds:
  esbuild: true
  sharp: false
```

### New Security Defaults

The plugin now owns and injects pnpm 11 build/security defaults that child
repos can override. Each default emits a prominent security warning box when a
child config weakens it (enables a blocked build, disables the flag, or lowers
the release-age threshold):

| Setting | Silk Default | Behavior |
| :--- | :--- | :--- |
| `strictDepBuilds` | `true` | Fail install on unreviewed build scripts |
| `blockExoticSubdeps` | `true` | Block git/tarball sources for transitive deps |
| `minimumReleaseAge` | (configured) | Minimum minutes since publication |
| `minimumReleaseAgeExclude` | `[]` | Package patterns exempt from the age check |

### New Inherited Settings

Four additional pnpm settings are now managed and merged by the plugin:

- **`packageExtensions`** — add missing metadata (deps, peer deps) to published
  packages that ship incomplete `package.json` files. Child entries are merged
  on top of silk defaults.
- **`allowedDeprecatedVersions`** — mute specific deprecation warnings. Merged
  map; child wins per key.
- **`supportedArchitectures`** — constrain optional-dependency installation by
  OS, CPU, and libc. Child arrays are unioned with silk defaults.
- **`auditConfig`** — allowlist GHSA or CVE identifiers from `pnpm audit`.
  Child arrays are unioned with silk defaults.

### New Public Types

Three TypeScript interfaces are now exported from the package entry point:

```typescript
import type {
  AuditConfig,
  PackageExtension,
  SupportedArchitectures,
} from "@savvy-web/pnpm-plugin-silk";
```

| Type | Shape |
| :--- | :--- |
| `PackageExtension` | `{ dependencies?, optionalDependencies?, peerDependencies?, peerDependenciesMeta? }` |
| `SupportedArchitectures` | `{ os?, cpu?, libc? }` |
| `AuditConfig` | `{ ignoreGhsas?, ignoreCves? }` |
