# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Status

This is **@savvy-web/pnpm-plugin-silk** - a pnpm config dependency plugin for
centralized catalog management across the Savvy Web ecosystem.

**Current Phase:** Active Development (v0.12.x)

**Key Features:**

- `catalog:silk` - Current/latest versions for direct dependencies
- `catalog:silkPeers` - Permissive ranges for peerDependencies
- `silkOverrides` - Security overrides for transitive dependency CVEs
- `onlyBuiltDependencies` - Allowlist for packages with build scripts
- `publicHoistPattern` - Packages hoisted to virtual store root
- `peerDependencyRules` - Syncs allowedVersions, ignoreMissing, allowAny
- Override warnings - Prominent console output when local versions diverge
- Auto-generation - Catalogs and overrides generated from `pnpm-workspace.yaml`

**Design Documentation:**

- Architecture: `@./.claude/design/pnpm-plugin-silk/catalog-management.md`
  Load when: adding catalog entries, modifying merge logic, debugging resolution,
  adding security overrides, understanding Effect catalog resolver architecture
- Implementation Plan: `@./.claude/plans/pnpm-plugin-silk-mvp.md` (completed)
- Effect Catalog Resolver:
  `@./.claude/skills/effect-catalog-resolver/SKILL.md`
  Load when: updating Effect ecosystem packages, checking version compatibility

## Commands

### Development

```bash
pnpm run lint              # Check code with Biome
pnpm run lint:fix          # Auto-fix lint issues
pnpm run typecheck         # Type-check via Turbo -> tsgo
pnpm run test              # Run all tests (54 tests: 45 unit + 9 integration)
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
├── index.ts                # Public API exports
├── pnpmfile.ts             # Entry point: Effect.runSync with Layer.merge
├── catalogs/
│   ├── types.ts            # Type definitions
│   ├── generated.ts        # Auto-generated from pnpm-workspace.yaml
│   └── index.ts            # Re-exports
├── services/
│   ├── CatalogProvider.ts           # Effect Context.Tag for catalog data
│   └── PeerDependencyRulesProvider.ts # Effect Context.Tag for peer rules
├── hooks/
│   ├── update-config.ts    # updateConfig Effect program
│   ├── merge-arrays.ts     # Array merge (onlyBuiltDependencies, etc.)
│   ├── merge-catalogs.ts   # Catalog merge with override warnings
│   ├── merge-overrides.ts  # Security override merge
│   ├── merge-peer-dependency-rules.ts # Peer dep rules merge
│   └── warnings.ts         # Override warning formatter
└── generate/
    └── generate-catalogs.ts # Effect program: reads yaml, writes TypeScript

lib/scripts/
└── run-generate.ts         # CLI runner for generate-catalogs

__test__/
├── hooks/                  # Unit tests for each merge module
├── generate/               # Integration tests with snapshots
├── integration/            # Pipeline integration tests with snapshots
├── fixtures/               # Catalog, workspace YAML, peer-rules fixtures
└── utils/                  # Test layer helpers (catalog-layer, fs-layer)

types/
└── global.d.ts             # Global type declarations
```

### Build Pipeline

Uses rslib-builder with `virtualEntries` for CJS output:

1. `prebuild` - Runs `generate:catalogs` + `lint:fix`
2. `build:dev` - Development build with source maps
3. `build:prod` - Production build for npm

**Key Output:** `dist/npm/pnpmfile.cjs` (self-contained CJS bundle)

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

### Effect Architecture

Hooks are Effect programs with dependency-injected services:

- `updateConfig` returns `Effect<PnpmConfig, never, CatalogProvider | PeerDependencyRulesProvider>`
- `pnpmfile.ts` runs synchronously via `Effect.runSync` with `Layer.merge` of both providers
- Individual merge functions are pure (not effectful) -- called inside `Effect.gen`

### Testing

- **Framework**: Vitest with v8 coverage
- **Pool**: Uses forks (not threads) for Effect-TS compatibility
- **Config**: `vitest.config.ts` with two projects: `unit` and `int`
- **Unit tests** (`__test__/hooks/`): Test individual merge functions
- **Integration tests** (`__test__/generate/`, `__test__/integration/`): Snapshot-based, test full pipeline
- **Fixtures** (`__test__/fixtures/`): Shared catalog, workspace YAML, and peer-rules data
- **Test utils** (`__test__/utils/`): Effect test layers for CatalogProvider, PeerDependencyRulesProvider, FS

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
