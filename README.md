# @savvy-web/pnpm-plugin-silk

[![npm version](https://img.shields.io/npm/v/@savvy-web/pnpm-plugin-silk)](https://www.npmjs.com/package/@savvy-web/pnpm-plugin-silk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-orange)](https://pnpm.io/)

Centralized dependency version management for the Silk ecosystem via pnpm
config dependencies. Share curated dependency catalogs, patches, and overrides
across multiple repositories from a single source of truth.

## Features

- **Dual catalog strategy** - Current versions for direct dependencies
  (`catalog:silk`), permissive ranges for peer dependencies (`catalog:silkPeers`)
- **Non-destructive merging** - Plugin catalogs merge with local definitions;
  local entries always take precedence
- **Override warnings** - Clear console output when local versions override
  Silk-managed defaults
- **Zero runtime dependencies** - Self-contained CommonJS bundle that pnpm loads
  directly

## Installation

Add as a config dependency using pnpm:

```bash
pnpm add --config @savvy-web/pnpm-plugin-silk
```

This adds the package to your `pnpm-workspace.yaml` with the required integrity
hash:

```yaml
configDependencies:
  "@savvy-web/pnpm-plugin-silk": "0.1.0+sha512-abc123..."
```

> **Note:** Config dependencies require exact versions with SHA-512 integrity
> checksums. The `pnpm add --config` command generates this automatically.

## Quick Start

Reference Silk catalogs in your `package.json`:

```json
{
  "devDependencies": {
    "typescript": "catalog:silk",
    "vitest": "catalog:silk"
  },
  "peerDependencies": {
    "typescript": "catalog:silkPeers"
  }
}
```

The `silk` catalog provides current/latest versions for your direct
dependencies, while `silkPeers` provides permissive ranges that allow consumers
to use older compatible versions.

## More Information

- [Contributing](./CONTRIBUTING.md) - Development setup and guidelines
- [Security Policy](./SECURITY.md) - Vulnerability reporting
- [Design Documentation](./.claude/design/pnpm-plugin-silk/catalog-management.md) - Architecture and implementation details

## License

[MIT](./LICENSE)
