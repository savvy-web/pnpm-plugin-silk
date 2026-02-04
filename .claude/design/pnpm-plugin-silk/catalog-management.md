---
status: current
module: pnpm-plugin-silk
category: architecture
created: 2026-02-03
updated: 2026-02-04
last-synced: 2026-02-04
completeness: 90
related: []
dependencies: []
implementation-plans:
  - ../plans/pnpm-plugin-silk-mvp.md
---

# Catalog Management - Architecture

Centralized dependency version management via pnpm config dependencies, enabling synchronized
catalogs, patches, and overrides across multiple Silk ecosystem repositories.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Rationale](#rationale)
4. [System Architecture](#system-architecture)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)
8. [Future Enhancements](#future-enhancements)
9. [Related Documentation](#related-documentation)

---

## Overview

The Silk plugin provides centralized dependency management for the Savvy Web ecosystem. Rather
than each repository independently maintaining dependency versions, peer dependency ranges, and
compatibility constraints, this plugin serves as a single source of truth that propagates to all
consuming repositories via pnpm's config dependency mechanism.

When a repository adds `@savvy-web/pnpm-plugin-silk` as a config dependency, it automatically
receives two named catalogs:

- **`catalog:silk`** - Current/latest versions for direct dependencies (kept up-to-date)
- **`catalog:silkPeers`** - Permissive ranges for peerDependencies (avoids forcing updates)

Plus future enhancements:

- **Patches** - Centralized bug fixes applied uniformly
- **Overrides** - Resolution rules for problematic transitive dependencies

The dual-catalog approach lets Silk modules stay current while not requiring consumers to
immediately upgrade. For example, a module can use `typescript: catalog:silk` (^5.9.4) for
its own devDependencies while declaring `peerDependencies: { typescript: catalog:silkPeers }`
(^5.0.0) to support users on older TypeScript versions.

**Key Design Principles:**

- **Zero runtime dependencies** - Config dependencies cannot have their own dependencies; all code
  must be self-contained and bundled
- **CommonJS export required** - pnpm loads `pnpmfile.cjs` from the package root; ESM source must
  compile to CJS
- **Named catalogs** - Use `silk` and `silkPeers` namespaces; don't override user's default catalog
- **Dual version strategy** - Current versions for direct deps, permissive ranges for peers
- **Non-destructive merging** - Plugin catalogs merge with (not replace) local catalogs; local
  definitions take precedence
- **Version pinning** - Config dependencies require exact versions with integrity checksums for
  reproducibility

**When to reference this document:**

- When adding new catalog entries to the plugin
- When modifying the catalog merging strategy
- When updating rslib-builder to support CJS output
- When debugging catalog resolution issues in consuming repos

---

## Current State

### System Components

The plugin consists of three main components that work together to provide catalog management.

#### Component 1: Catalog Definitions

**Location:** `src/catalogs/`

**Purpose:** Define curated dependency versions with separate strategies for direct deps vs peers

**Actual Files:**

- `src/catalogs/types.ts` - Type definitions (`SilkCatalogs`, `Catalog`)
- `src/catalogs/generated.ts` - Auto-generated from `pnpm-workspace.yaml`
- `src/catalogs/index.ts` - Re-exports from generated.ts

**Generation Workflow:**

Catalogs are generated from `pnpm-workspace.yaml` via `scripts/generate-catalogs.ts`:

```bash
pnpm run generate:catalogs  # Reads workspace yaml, generates TypeScript
pnpm run build              # Runs generate:catalogs via prebuild hook
```

**Key interfaces/APIs:**

```typescript
// src/catalogs/types.ts
interface SilkCatalogs {
  silk: Record<string, string>;      // Current versions for direct deps
  silkPeers: Record<string, string>; // Permissive ranges for peers
}

// src/catalogs/generated.ts (auto-generated)
export const silkCatalogs: SilkCatalogs = {
  silk: {
    typescript: "^5.9.3",
    vitest: "^4.0.18",
    // ... more entries from pnpm-workspace.yaml
  },
  silkPeers: {
    typescript: "^5.9.3",
    husky: "^9.1.7",
    // ... more entries from pnpm-workspace.yaml
  },
};
```

#### Component 2: pnpmfile Hooks

**Location:** `src/hooks/`

**Purpose:** Implement pnpm hooks that inject catalog entries into consuming repositories

**Actual Files:**

- `src/hooks/update-config.ts` - Main hook implementation with merge logic
- `src/hooks/warnings.ts` - Override warning formatter (box-styled console output)
- `src/pnpmfile.ts` - Entry point exporting `module.exports = { hooks: { updateConfig } }`

**Key interfaces/APIs:**

```typescript
// src/hooks/update-config.ts
export interface PnpmConfig {
  catalogs?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export function updateConfig(config: PnpmConfig): PnpmConfig {
  // 1. Read plugin catalogs (silkCatalogs.silk, silkCatalogs.silkPeers)
  // 2. Read existing config catalogs
  // 3. Merge (local wins, emit warnings for overrides)
  // 4. Return updated config with silk and silkPeers catalogs
}

// src/hooks/warnings.ts
export interface Override {
  catalog: string;
  package: string;
  silkVersion: string;
  localVersion: string;
}

export function formatOverrideWarning(overrides: Override[]): string;
export function warnOverrides(overrides: Override[]): void;
```

#### Component 3: Bundle Output

**Location:** `dist/npm/pnpmfile.cjs`

**Purpose:** Self-contained CommonJS bundle that pnpm can load directly

**Responsibilities:**

- Bundle all source code into single CJS file
- Include catalog definitions inline (no external imports)
- Maintain compatibility with pnpm's hook loading mechanism

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    @savvy-web/pnpm-plugin-silk                   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Catalog Defs    │  │  Hook Handlers   │  │  Patch Files  │ │
│  │  src/catalogs/   │  │  src/hooks/      │  │  patches/     │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └──────────┬──────────┴─────────────────────┘         │
│                      │                                           │
│                      ▼                                           │
│           ┌──────────────────────┐                              │
│           │   rslib-builder      │                              │
│           │   (CJS bundling)     │                              │
│           └──────────┬───────────┘                              │
│                      │                                           │
│                      ▼                                           │
│           ┌──────────────────────┐                              │
│           │  dist/npm/           │                              │
│           │  └── pnpmfile.cjs    │                              │
│           └──────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ pnpm add --config
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Consuming Repository                          │
│                                                                  │
│  pnpm-workspace.yaml                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ configDependencies:                                         │ │
│  │   "@savvy-web/pnpm-plugin-silk": "1.0.0+sha512-..."        │ │
│  │                                                             │ │
│  │ catalog:           ◄─── merged from plugin + local         │ │
│  │   typescript: ^5.8.0                                        │ │
│  │   vitest: ^3.0.0                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Current Limitations

Known limitations of the current architecture:

- **No transitive config dependencies** - Config dependencies cannot have their own dependencies;
  everything must be bundled into the plugin
- **CommonJS only** - pnpm requires `pnpmfile.cjs`; ESM is not supported for hooks
- **Exact versions required** - Config dependencies must use exact versions with integrity
  checksums, not ranges

### Resolved Limitations

- ~~**rslib-builder CJS gap**~~ - Resolved in rslib-builder v0.10.0 via `virtualEntries` feature

---

## Rationale

### Architectural Decisions

#### Decision 1: pnpm Config Dependencies vs. Shared Package

**Context:** Need to distribute centralized configuration (catalogs, patches, overrides) across
multiple repositories in the Silk ecosystem.

**Options considered:**

1. **Option A (Chosen): pnpm Config Dependencies**
   - Pros: Native pnpm integration, automatic hook loading, versioned with integrity checks,
     installs before other dependencies
   - Cons: Must bundle everything (no dependencies), CJS only, relatively new feature
   - Why chosen: Purpose-built for this exact use case; provides the cleanest integration

2. **Option B: Shared npm package with manual pnpmfile import**
   - Pros: More flexible, can have dependencies, supports ESM
   - Cons: Requires manual `.pnpmfile.cjs` setup in each repo, version sync is manual
   - Why rejected: Defeats the purpose of centralization; too much boilerplate per repo

3. **Option C: Git submodules or copy-paste**
   - Pros: Simple, no publishing needed
   - Cons: No versioning, manual sync, prone to drift
   - Why rejected: Does not scale; version management becomes a nightmare

#### Decision 2: updateConfig Hook for Catalog Injection

**Context:** Need to merge plugin-provided catalogs into consuming repo's workspace configuration.

**Options considered:**

1. **Option A (Chosen): updateConfig hook**
   - Pros: Direct config mutation, runs early in pnpm lifecycle, clean API
   - Cons: Limited to config modification (cannot modify files directly)
   - Why chosen: Designed specifically for config dependencies to share settings

2. **Option B: afterAllResolved hook with lockfile manipulation**
   - Pros: Full lockfile access, can modify resolved versions
   - Cons: Too late in lifecycle, doesn't affect initial resolution, complex
   - Why rejected: Catalogs need to influence resolution, not post-process it

### Design Patterns Used

#### Pattern 1: Merge with Local Precedence

- **Where used:** Catalog merging in updateConfig hook
- **Why used:** Allows repos to override specific entries while inheriting defaults
- **Implementation:** `{ ...pluginCatalogs, ...localCatalogs }` - local entries win conflicts

#### Pattern 2: Self-Contained Bundle

- **Where used:** Build output (pnpmfile.cjs)
- **Why used:** Config dependencies cannot have their own dependencies
- **Implementation:** rslib-builder bundles all source + data into single CJS file

### Constraints and Trade-offs

#### Constraint 1: No Dependencies Allowed

- **Description:** pnpm config dependencies cannot declare dependencies in package.json
- **Impact:** Cannot use any external libraries; must bundle everything or write from scratch
- **Mitigation:** Use rslib-builder to bundle all code; keep implementation minimal

#### Constraint 2: CommonJS Export Required

- **Description:** pnpm loads `pnpmfile.cjs` specifically; ESM not supported
- **Impact:** Must transpile ESM source to CJS; need to update rslib-builder
- **Mitigation:** Add CJS output format support to rslib-builder configuration

#### Trade-off 1: Centralization vs. Flexibility

- **What we gained:** Single source of truth, reduced maintenance, consistent versions
- **What we sacrificed:** Per-repo customization requires explicit overrides
- **Why it's worth it:** Consistency across ecosystem is more valuable than maximum flexibility

---

## System Architecture

### Layered Architecture

The plugin uses a simple two-layer architecture: data definition and hook implementation.

#### Layer 1: Data Layer

**Responsibilities:**

- Define catalog entries with version ranges
- Generate TypeScript from pnpm-workspace.yaml
- Export typed catalog definitions

**Components:**

- `pnpm-workspace.yaml` - Source of truth for catalog versions
- `scripts/generate-catalogs.ts` - Generator script (reads yaml, writes TypeScript)
- `src/catalogs/types.ts` - Type definitions
- `src/catalogs/generated.ts` - Auto-generated catalog data
- `src/catalogs/index.ts` - Re-exports for public API

**Communication:** Exports static data structures consumed by hook layer

#### Layer 2: Hook Layer

**Responsibilities:**

- Implement pnpm hook contracts
- Merge plugin data with local configuration
- Emit warnings for overrides

**Components:**

- `src/hooks/update-config.ts` - `updateConfig` hook with merge logic
- `src/hooks/warnings.ts` - Override detection and warning formatter
- `src/pnpmfile.ts` - Entry point (`module.exports = { hooks: { updateConfig } }`)

**Communication:** Called by pnpm during install lifecycle

### Component Interactions

#### Interaction 1: Catalog Injection During Install

**Participants:** pnpm, pnpmfile.cjs, Catalog Definitions

**Flow:**

1. User runs `pnpm install` in consuming repo
2. pnpm loads config dependency's `pnpmfile.cjs`
3. pnpm calls `updateConfig(currentConfig)`
4. Hook reads plugin catalog definitions
5. Hook merges with existing config catalogs (local wins)
6. Hook returns modified config
7. pnpm uses merged catalogs for resolution

**Sequence diagram:**

```text
pnpm           pnpmfile.cjs    Catalogs
│                   │              │
├──────────────────>│              │  1. updateConfig(config)
│                   ├─────────────>│  2. getCatalogs()
│                   │<─────────────┤  3. catalogData
│                   │              │
│                   │ merge catalogs
│                   │              │
│<──────────────────┤              │  4. return mergedConfig
│                   │              │
│ use for resolution│              │
│                   │              │
```

### Error Handling Strategy

Hooks must be resilient since failures can break `pnpm install` entirely.

- **Missing local config:** Return plugin defaults without merging
- **Invalid catalog entry:** Log warning, skip invalid entry, continue with valid entries
- **Hook exception:** Catch at top level, log error, return unmodified config (fail-safe)

### Override Warning Strategy

When a local catalog entry overrides a Silk-managed version, emit prominent console warnings:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  SILK CATALOG OVERRIDE DETECTED                                  │
├─────────────────────────────────────────────────────────────────────┤
│  The following entries override Silk-managed versions:              │
│                                                                     │
│  catalogs.silk.typescript                                           │
│    Silk version:  ^5.9.4                                            │
│    Local override: ^5.8.0                                           │
│                                                                     │
│  catalogs.silkPeers.vitest                                          │
│    Silk version:  ^2.0.0 || ^3.0.0                                  │
│    Local override: ^3.0.0                                           │
│                                                                     │
│  Local versions will be used. To use Silk defaults, remove these    │
│  entries from your pnpm-workspace.yaml catalogs section.            │
└─────────────────────────────────────────────────────────────────────┘
```

This ensures:

- **Flexibility:** Users can override when necessary
- **Visibility:** Overrides are impossible to miss during install
- **Traceability:** Clear diff between Silk and local versions
- **Guidance:** Instructions on how to revert to Silk defaults

---

## Data Flow

### Data Model

Key data structures used throughout the plugin.

```typescript
// pnpm config object passed to updateConfig hook
interface PnpmConfig {
  catalogs?: Record<string, Record<string, string>>; // named catalogs
  catalog?: Record<string, string>;                   // default catalog
  overrides?: Record<string, string>;
  patchedDependencies?: Record<string, string>;
  // ... other pnpm settings
}

// Plugin catalog structure
interface SilkCatalogs {
  // Named catalog for direct dependencies (current/latest versions)
  silk: Record<string, string>;
  // Named catalog for peer dependency ranges (more permissive)
  silkPeers: Record<string, string>;
}

// Example catalog definitions
const silkCatalogs: SilkCatalogs = {
  silk: {
    typescript: "^5.9.4",      // Current version for direct deps
    vitest: "^3.0.0",
    effect: "^3.12.0",
  },
  silkPeers: {
    typescript: "^5.0.0",      // Permissive range for peerDependencies
    vitest: "^2.0.0 || ^3.0.0",
    effect: "^3.0.0",
  },
};

// Merge result - adds silk catalogs to named catalogs
interface MergedConfig extends PnpmConfig {
  catalogs: {
    silk: Record<string, string>;       // current versions
    silkPeers: Record<string, string>;  // peer ranges
    [other: string]: Record<string, string>;
  };
}
```

### Data Flow Diagrams

#### Flow 1: Initial Installation

```text
[pnpm install]
      │
      ▼
[Load pnpmfile.cjs from config dependency]
      │
      ▼
[Call updateConfig(existingConfig)]
      │
      ├─────────────────────────────────┐
      │                                 │
      ▼                                 ▼
[Read plugin catalogs]          [Read local catalogs]
      │                                 │
      └──────────┬──────────────────────┘
                 │
                 ▼
        [Merge: local > plugin]
                 │
                 ▼
        [Return merged config]
                 │
                 ▼
[pnpm resolves dependencies using merged catalogs]
```

**Steps:**

1. User runs `pnpm install` in repo with `@savvy-web/pnpm-plugin-silk` config dependency
2. pnpm automatically loads `pnpmfile.cjs` from the config dependency
3. `updateConfig` hook receives current pnpm configuration
4. Plugin reads its bundled catalog definitions
5. Plugin reads any existing catalogs from local config
6. Catalogs are merged (local entries override plugin entries)
7. Merged configuration returned to pnpm
8. pnpm uses merged catalogs for dependency resolution

#### Flow 2: Named Catalog Usage in Consuming Repo

```text
Plugin provides named catalogs:        Consuming repo package.json:
catalogs:                              {
  silk:                                  "dependencies": {
    typescript: "^5.9.4"                   "typescript": "catalog:silk"  ← uses 5.9.4
    vitest: "^3.0.0"                     },
  silkPeers:                             "peerDependencies": {
    typescript: "^5.0.0"                   "typescript": "catalog:silkPeers"  ← uses ^5.0.0
    vitest: "^2.0.0 || ^3.0.0"           }
                                       }
```

#### Flow 3: Local Override of Silk Catalog

```text
Plugin catalogs:                Local pnpm-workspace.yaml:
catalogs:                       catalogs:
  silk:                           silk:
    typescript: "^5.9.4"            typescript: "^5.8.0"  ← override
    vitest: "^3.0.0"

                    │
                    ▼

Merged Result (used by pnpm):
catalogs:
  silk:
    typescript: "^5.8.0"  ← local wins
    vitest: "^3.0.0"      ← from plugin
```

### State Management

The plugin is stateless—all data is determined at hook invocation time.

- **Where state lives:** No persistent state; catalogs are static data bundled in plugin
- **How state is updated:** Plugin updates require new version release; local overrides are
  immediate
- **State consistency:** Guaranteed by pnpm's atomic install process

---

## Integration Points

### Internal Integrations

#### Integration 1: rslib-builder

**How it integrates:** Uses `virtualEntries` feature (v0.10.0+) to bundle pnpmfile.cjs

**Actual Configuration:**

```typescript
// rslib.config.ts
import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
  virtualEntries: {
    "pnpmfile.cjs": {
      source: "./src/pnpmfile.ts",
      format: "cjs",
    },
  },
  transform({ pkg }) {
    delete pkg.devDependencies;
    delete pkg.scripts;
    delete pkg.publishConfig;
    delete pkg.devEngines;
    return pkg;
  },
});
```

**Data exchange:** TypeScript source → bundled CommonJS (4KB self-contained)

**Feature:** `virtualEntries` added to rslib-builder v0.10.0 specifically for this use case

#### Integration 2: Silk Ecosystem Modules

**How it integrates:** Plugin defines version ranges for other Silk modules

**Interface:**

```typescript
// Example catalog entries for Silk modules
const silkModules = {
  "@savvy-web/rslib-builder": "^1.0.0",
  "@savvy-web/lint-staged": "^1.0.0",
  "@savvy-web/commitlint": "^1.0.0",
};
```

**Data exchange:** Version strings consumed by pnpm during resolution

### External Integrations

#### Integration 1: pnpm Hook System

**Purpose:** Primary integration point; pnpm calls exported hooks during install

**Protocol:** CommonJS module.exports with hooks object

**Interface:**

```javascript
// pnpmfile.cjs
module.exports = {
  hooks: {
    updateConfig(config) {
      // Merge plugin catalogs into config
      return mergedConfig;
    },
  },
};
```

**Error handling:** Exceptions in hooks can break install; use try-catch with fail-safe defaults

#### Integration 2: pnpm-workspace.yaml

**Purpose:** pnpm reads workspace config including catalogs and config dependencies

**Protocol:** YAML file in repository root

**Configuration example:**

```yaml
# Consuming repo's pnpm-workspace.yaml
packages:
  - "pkgs/*"

configDependencies:
  "@savvy-web/pnpm-plugin-silk": "1.0.0+sha512-abc123..."

# After plugin runs, catalogs are available:
# catalogs:
#   silk:
#     typescript: "^5.9.4"
#   silkPeers:
#     typescript: "^5.0.0"

# Local overrides (optional, merged with plugin)
catalogs:
  silk:
    typescript: "^5.8.0"  # Override plugin's version
```

**Error handling:** Invalid YAML or missing fields cause pnpm to fail with descriptive error

#### Integration 3: npm Registry

**Purpose:** Plugin is published to npm; consumed via `pnpm add --config`

**Protocol:** npm registry API (via pnpm)

**Authentication:** Standard npm token for @savvy-web scope (GitHub Packages + npm)

**Integrity:** Config dependencies require SHA-512 checksum in pnpm-workspace.yaml

---

## Testing Strategy

### Architecture Testing

The plugin requires testing at multiple levels given its integration with pnpm's install lifecycle.

**Component isolation:**

- Catalog merging logic tested independently of pnpm
- Hook handlers tested with mock config objects
- No external dependencies needed for unit tests

**Integration testing:**

- Test actual pnpm install in fixture repository
- Verify catalogs appear in resolved lockfile
- Test local override precedence

### Unit Tests

**Location:** `src/**/*.test.ts`

**Coverage target:** 90%+

**What to test:**

- Catalog merge function with various input combinations
- Empty catalog handling (plugin-only, local-only, both, neither)
- Conflict resolution (local wins)
- Named catalog merging
- Invalid input handling (malformed catalogs)

**Example test cases:**

```typescript
describe("mergeCatalogs", () => {
  it("merges silk catalog with local overrides", () => {
    const pluginSilk = { typescript: "^5.9.4", vitest: "^3.0.0" };
    const localSilk = { typescript: "^5.8.0" };

    const result = mergeSilkCatalog(pluginSilk, localSilk);

    expect(result).toEqual({
      typescript: "^5.8.0", // local wins
      vitest: "^3.0.0",     // from plugin
    });
  });

  it("provides both silk and silkPeers catalogs", () => {
    const config = updateConfig({ catalogs: {} });

    expect(config.catalogs.silk).toBeDefined();
    expect(config.catalogs.silkPeers).toBeDefined();
    expect(config.catalogs.silk.typescript).toBe("^5.9.4");
    expect(config.catalogs.silkPeers.typescript).toBe("^5.0.0");
  });
});
```

### Integration Tests

**Location:** `tests/integration/`

**What to test:**

- Full pnpm install with plugin as config dependency
- Catalog resolution in lockfile
- Local override behavior
- Error recovery (malformed plugin doesn't break install)

---

## Future Enhancements

### Phase 1: MVP (v1.0.0)

- **Catalog management** - Core catalog merging via updateConfig hook
- **CJS bundling** - Add CJS output support to rslib-builder
- **Initial catalogs** - Define versions for Silk ecosystem modules

### Phase 2: Security Overrides (v1.1.0)

- **Override management** - Centralize `overrides` field for transitive dependency resolution
- **Security response** - When a CVE is discovered in a transitive dependency, push a fix to all
  consuming repos by updating the plugin
- **Override warnings** - Similar to catalog warnings, alert when local overrides conflict

Example use case:

```yaml
# Plugin injects into pnpm config
overrides:
  "lodash@<4.17.21": "4.17.21"  # CVE-2021-23337
  "minimist@<1.2.6": "1.2.6"    # CVE-2021-44906
```

### Phase 3: Patch Distribution (v1.2.0)

- **Centralized patches** - Store patch files in plugin package
- **Patch references** - Plugin sets `patchedDependencies` pointing to bundled patches
- **Patch for unpublished fixes** - Apply fixes before upstream releases

Example use case:

```yaml
# Plugin injects into pnpm config
patchedDependencies:
  "some-package@1.2.3": "patches/some-package@1.2.3.patch"
```

The patch files are bundled inside the plugin package and referenced via the config dependency path.

### Phase 4: Advanced Features (v2.0.0)

- **Conditional catalogs** - Different catalogs based on repo type or Node version
- **Catalog validation** - Verify catalog entries resolve to valid packages
- **Migration tooling** - Assist repos in adopting Silk catalogs
- **readPackage hook** - Transform package manifests (e.g., inject peer dependencies)

### Potential Refactoring

Areas that may need refactoring in the future:

- **Catalog organization** - As catalog grows, may need to split into separate modules/files
- **Hook composition** - If multiple hooks needed, may need shared context/utilities

---

## Related Documentation

**Internal Design Docs:**

- (Future) [Patch Management](./patch-management.md) - Centralized patch distribution
- (Future) [Override Strategy](./override-strategy.md) - Transitive dependency overrides

**Package Documentation:**

- `README.md` - Package overview and usage instructions
- `CLAUDE.md` - Development guide for contributors

**External Resources:**

- [pnpm Config Dependencies](https://pnpm.io/config-dependencies) - Official config dependency docs
- [pnpm Catalogs](https://pnpm.io/catalogs) - Catalog feature documentation
- [pnpm Hooks (pnpmfile)](https://pnpm.io/pnpmfile) - Hook API reference
- [pnpm Workspace Configuration](https://pnpm.io/pnpm-workspace_yaml) - Workspace YAML reference

---

**Document Status:** Current (90% complete) - MVP implementation complete

**Synced:** 2026-02-04

**Implementation Summary:**

- Package structure created at repo root (single package, not monorepo)
- Rslib virtualEntries feature (v0.10.0) used for CJS bundling
- Catalog generation from `pnpm-workspace.yaml` implemented
- `updateConfig` hook with override warnings implemented
- 15 unit tests passing

**Build Output:**

- `dist/npm/pnpmfile.cjs` (4KB) - Self-contained CJS bundle
- `dist/npm/index.js` - ESM public API
- `dist/npm/index.d.ts` - Type declarations

**Next Steps:**

1. Publish initial version to npm
2. Test as config dependency in another repo
3. Phase 2: Add security overrides support
4. Phase 3: Add patch distribution
