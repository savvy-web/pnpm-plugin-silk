# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Status

This is **@savvy-web/pnpm-plugin-silk** - a pnpm config dependency plugin for
centralized catalog management across the Savvy Web ecosystem.

**Current Phase:** Active Development (v0.3.0)

**Key Features:**

- `catalog:silk` - Current/latest versions for direct dependencies
- `catalog:silkPeers` - Permissive ranges for peerDependencies
- `silkOverrides` - Security overrides for transitive dependency CVEs
- `onlyBuiltDependencies` - Allowlist for packages with build scripts
- `publicHoistPattern` - Packages hoisted to virtual store root
- Biome schema sync - Auto-updates `$schema` URLs in `biome.json`/`biome.jsonc`
- Override warnings - Prominent console output when local versions diverge
- Auto-generation - Catalogs and overrides generated from `pnpm-workspace.yaml`

**Design Documentation:**

- Architecture: `@./.claude/design/pnpm-plugin-silk/catalog-management.md`
  Load when: adding catalog entries, modifying merge logic, debugging resolution,
  adding security overrides, modifying Biome schema sync
- Implementation Plan: `@./.claude/plans/pnpm-plugin-silk-mvp.md` (completed)

## Commands

### Development

```bash
pnpm run lint              # Check code with Biome
pnpm run lint:fix          # Auto-fix lint issues
pnpm run typecheck         # Type-check via Turbo -> tsgo
pnpm run test              # Run all tests (51 tests)
pnpm run test:watch        # Run tests in watch mode
pnpm run test:coverage     # Run tests with coverage report
```

### Building

```bash
pnpm run generate:catalogs # Regenerate catalogs from pnpm-workspace.yaml
pnpm run build             # Build (runs generate:catalogs via prebuild)
pnpm run build:dev         # Build development output only
pnpm run build:prod        # Build production/npm output only
```

### Updating Versions

```bash
# 1. Update versions in pnpm-workspace.yaml (or use pnpm up)
pnpm up -i -r --latest

# 2. Rebuild (auto-regenerates catalogs)
pnpm run build

# 3. Test and commit
pnpm run test
```

## Architecture

### Package Structure

Single-package repository (not a monorepo):

```text
src/
├── index.ts              # Public API exports
├── index.test.ts         # Unit tests (51 tests)
├── pnpmfile.ts           # Async pnpm hook entry point
├── catalogs/
│   ├── types.ts          # Type definitions
│   ├── generated.ts      # Auto-generated from pnpm-workspace.yaml
│   └── index.ts          # Re-exports
└── hooks/
    ├── update-config.ts  # updateConfig hook implementation
    ├── warnings.ts       # Override warning formatter
    └── sync-biome-schema.ts  # Biome $schema URL synchronization

scripts/
└── generate-catalogs.ts  # Reads yaml, writes TypeScript

types/
└── parse-gitignore.d.ts  # Type declarations for parse-gitignore v2
```

### Build Pipeline

Uses rslib-builder with `virtualEntries` for CJS output:

1. `prebuild` - Runs `generate:catalogs` + `lint:fix`
2. `build:dev` - Development build with source maps
3. `build:prod` - Production build for npm

**Key Output:** `dist/npm/pnpmfile.cjs` (~73KB self-contained CJS bundle,
includes bundled `jsonc-parser` and `parse-gitignore`)

### Code Quality

- **Biome**: Unified linting and formatting (replaces ESLint + Prettier)
- **Commitlint**: Enforces conventional commits with DCO signoff
- **Husky Hooks**:
  - `pre-commit`: Runs lint-staged
  - `commit-msg`: Validates commit message format
  - `pre-push`: Runs tests for affected packages

### TypeScript Configuration

- Composite builds with project references
- Strict mode enabled
- ES2022/ES2023 targets
- Import extensions required (`.js` for ESM)

### Testing

- **Framework**: Vitest with v8 coverage
- **Pool**: Uses forks (not threads) for Effect-TS compatibility
- **Config**: `vitest.config.ts` supports project-based filtering via
  `--project` flag

## Conventions

### Imports

- Use `.js` extensions for relative imports (ESM requirement)
- Use `node:` protocol for Node.js built-ins
- Separate type imports: `import type { Foo } from './bar.js'`

### Commits

All commits require:

1. Conventional commit format (feat, fix, chore, etc.)
2. DCO signoff: `Signed-off-by: Name <email>`

### Publishing

Packages publish to both GitHub Packages and npm with provenance.
Uses changesets (`@changesets/cli`) for versioning and changelog generation.
