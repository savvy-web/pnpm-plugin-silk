# Contributing

Thank you for your interest in contributing! This document provides guidelines
and instructions for development.

## Prerequisites

- Node.js 24.11.0+
- pnpm 10.28.2+

## Development Setup

```bash
# Clone the repository
git clone https://github.com/savvy-web/pnpm-plugin-silk.git
cd pnpm-plugin-silk

# Install dependencies
pnpm install

# Build all outputs
pnpm run build

# Run tests
pnpm run test
```

## Project Structure

```text
pnpm-plugin-silk/
├── src/
│   ├── catalogs/              # Catalog definitions and types
│   │   ├── generated.ts       # Auto-generated from pnpm-workspace.yaml
│   │   ├── index.ts           # Public exports
│   │   └── types.ts           # Type definitions
│   ├── hooks/                 # pnpm hook implementations
│   │   ├── sync-biome-schema.ts  # Biome $schema URL synchronization
│   │   ├── update-config.ts      # updateConfig hook with merge logic
│   │   └── warnings.ts           # Override warning formatter
│   ├── index.ts               # Package entry point
│   ├── index.test.ts          # Unit tests
│   └── pnpmfile.ts            # pnpm hook entry point (async)
├── scripts/
│   └── generate-catalogs.ts   # Reads workspace yaml, writes TypeScript
├── types/
│   └── parse-gitignore.d.ts   # Type declarations for parse-gitignore
├── dist/
│   ├── dev/                   # Development build
│   └── npm/                   # Production build for publishing
└── lib/
    └── configs/               # Shared configuration files
```

## Available Scripts

| Script | Description |
| --- | --- |
| `pnpm run build` | Build all outputs (dev + prod) |
| `pnpm run build:dev` | Build development output only |
| `pnpm run build:prod` | Build production/npm output only |
| `pnpm run test` | Run all tests |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run test:coverage` | Run tests with coverage report |
| `pnpm run lint` | Check code with Biome |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run lint:md` | Lint markdown files |
| `pnpm run typecheck` | Type-check with tsgo (TypeScript native) |
| `pnpm run generate:catalogs` | Regenerate catalogs from workspace yaml |

## Code Quality

This project uses:

- **Biome** for linting and formatting
- **Commitlint** for enforcing conventional commits
- **Husky** for Git hooks

### Commit Format

All commits must follow the [Conventional Commits](https://conventionalcommits.org)
specification and include a DCO signoff:

```text
feat: add new catalog entries

Signed-off-by: Your Name <your.email@example.com>
```

### Git Hooks

The following checks run automatically via Husky:

- **commit-msg**: Validates conventional commit format via commitlint
- **post-checkout**: Ensures shell script permissions are correct
- **post-merge**: Ensures shell script permissions are correct

## Testing

Tests use [Vitest](https://vitest.dev) with v8 coverage.

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

## TypeScript

- Strict mode enabled
- ES2022/ES2023 targets
- Import extensions required (`.js` for ESM)

### Import Conventions

```typescript
// Use .js extensions for relative imports (ESM requirement)
import { silkCatalogs } from "./catalogs/index.js";

// Use node: protocol for Node.js built-ins
import { readFileSync } from "node:fs";

// Separate type imports
import type { SilkCatalogs } from "./catalogs/types.js";
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `pnpm run test`
5. Run linting: `pnpm run lint:fix`
6. Commit with conventional format and DCO signoff
7. Push and open a pull request

## License

By contributing, you agree that your contributions will be licensed under the
MIT License.
