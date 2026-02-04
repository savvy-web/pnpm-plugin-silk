# @savvy-web/pnpm-plugin-silk

[![npm version](https://img.shields.io/npm/v/@savvy-web/pnpm-plugin-silk)](https://www.npmjs.com/package/@savvy-web/pnpm-plugin-silk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-orange)](https://pnpm.io/)

Centralized dependency version management for the Silk ecosystem via pnpm
config dependencies. Share curated dependency catalogs, security overrides,
and build configurations across multiple repositories from a single source
of truth.

## Features

- **Dual catalog strategy** - Current versions for direct dependencies
  (`catalog:silk`), permissive ranges for peer dependencies (`catalog:silkPeers`)
- **Security overrides** - Centralized CVE fixes via `silkOverrides` that
  propagate to all consuming repositories
- **Build configuration sync** - Shared `onlyBuiltDependencies` and
  `publicHoistPattern` settings
- **Non-destructive merging** - Local definitions always take precedence with
  clear warnings for divergences

## Installation

Add as a config dependency using pnpm:

```bash
pnpm add --config @savvy-web/pnpm-plugin-silk
```

This adds the package to your `pnpm-workspace.yaml` with the required integrity
hash:

```yaml
configDependencies:
  "@savvy-web/pnpm-plugin-silk": "0.2.0+sha512-..."
```

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

The `silk` catalog provides current/latest versions for direct dependencies,
while `silkPeers` provides permissive ranges for peer dependencies. Security
overrides, build script allowlists, and hoist patterns are automatically
merged during `pnpm install`.

## More Information

- [Contributing](./CONTRIBUTING.md) - Development setup and guidelines
- [Security Policy](./SECURITY.md) - Vulnerability reporting
- [Design Documentation](./.claude/design/pnpm-plugin-silk/catalog-management.md) - Architecture and implementation details

## License

[MIT](./LICENSE)
