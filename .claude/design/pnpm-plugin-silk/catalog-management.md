---
status: current
module: pnpm-plugin-silk
category: architecture
created: 2026-02-03
updated: 2026-04-22
last-synced: 2026-04-22
completeness: 95
related: []
dependencies: []
implementation-plans:
  - ../plans/pnpm-plugin-silk-mvp.md
  - ../plans/serene-tinkering-lantern.md
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
8. [Effect Ecosystem Version Strategy](#effect-ecosystem-version-strategy)
9. [Effect Catalog Resolver Skill](#effect-catalog-resolver-skill)
10. [Future Enhancements](#future-enhancements)
11. [Related Documentation](#related-documentation)

---

## Overview

The Silk plugin provides centralized dependency management for the Savvy Web ecosystem. Rather
than each repository independently maintaining dependency versions, peer dependency ranges, and
compatibility constraints, this plugin serves as a single source of truth that propagates to all
consuming repositories via pnpm's config dependency mechanism.

When a repository adds `@savvy-web/pnpm-plugin-silk` as a config dependency, it automatically
receives two named catalogs and security overrides:

- **`catalog:silk`** - Current/latest versions for direct dependencies (kept up-to-date)
- **`catalog:silkPeers`** - Permissive ranges for peerDependencies (avoids forcing updates)
- **`overrides`** - Security fixes for transitive dependency CVEs (merged with local overrides)
- **`onlyBuiltDependencies`** - Packages allowed to run build scripts during install
- **`publicHoistPattern`** - Packages to hoist to the virtual store root

Plus future enhancements:

- **Patches** - Centralized bug fixes applied uniformly

The dual-catalog approach lets Silk modules stay current while not requiring consumers to
immediately upgrade. For example, a module can use `typescript: catalog:silk` (^6.0.2) for
its own devDependencies while declaring `peerDependencies: { typescript: catalog:silkPeers }`
(^6.0.0) to support users on older TypeScript versions.

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

Catalogs and overrides are generated from `pnpm-workspace.yaml` via `scripts/generate-catalogs.ts`:

```bash
pnpm run generate:catalogs  # Reads workspace yaml, generates TypeScript
pnpm run build              # Runs generate:catalogs via prebuild hook
```

The generator reads:

- `catalogs.silk` - Direct dependency versions
- `catalogs.silkPeers` - Peer dependency ranges
- `overrides` - Security overrides for transitive dependency CVEs
- `onlyBuiltDependencies` - Packages allowed to run build scripts
- `publicHoistPattern` - Packages to hoist to virtual store root

**Key interfaces/APIs:**

```typescript
// src/catalogs/types.ts
interface SilkCatalogs {
  silk: Record<string, string>;         // Current versions for direct deps
  silkPeers: Record<string, string>;    // Permissive ranges for peers
  silkOverrides: Record<string, string>; // Security overrides for CVEs
  silkOnlyBuiltDependencies: string[];  // Packages allowed to run build scripts
  silkPublicHoistPattern: string[];     // Packages to hoist to virtual store root
}

// src/catalogs/generated.ts (auto-generated)
export const silkCatalogs: SilkCatalogs = {
  silk: {
    typescript: "^6.0.2",
    effect: "^3.21.0",
    react: "^19.2.5",
    // ... more entries from pnpm-workspace.yaml catalogs.silk
  },
  silkPeers: {
    typescript: "^6.0.0",
    effect: ">=3.21.0",
    react: "^19.2.0",
    // ... more entries from pnpm-workspace.yaml catalogs.silkPeers
  },
  silkOverrides: {
    "@isaacs/brace-expansion": "^5.0.1",  // CVE-2026-25547
    lodash: "^4.17.23",                   // CVE-2025-13465
    tmp: "^0.2.4",                        // GHSA-52f5-9888-hmc6
    // ... more entries from pnpm-workspace.yaml overrides
  },
  silkOnlyBuiltDependencies: [
    "@parcel/watcher",
    "esbuild",
    // ... more entries from pnpm-workspace.yaml onlyBuiltDependencies
  ],
  silkPublicHoistPattern: [
    "typescript",
    "turbo",
    // ... more entries from pnpm-workspace.yaml publicHoistPattern
  ],
};
```

#### Component 2: pnpmfile Hooks

**Location:** `src/hooks/`

**Purpose:** Implement pnpm hooks that inject catalog entries into consuming repositories

**Actual Files:**

- `src/hooks/update-config.ts` - Main hook implementation with merge logic
- `src/hooks/warnings.ts` - Override warning formatter (box-styled console output)
- `src/pnpmfile.ts` - Synchronous entry point exporting `module.exports = { hooks: { updateConfig } }`

**Key interfaces/APIs:**

```typescript
// src/hooks/update-config.ts
export interface PnpmConfig {
  catalogs?: Record<string, Record<string, string>>;
  overrides?: Record<string, string>;
  onlyBuiltDependencies?: string[];
  publicHoistPattern?: string[];
  [key: string]: unknown;
}

export function updateConfig(config: PnpmConfig): PnpmConfig {
  // 1. Read plugin catalogs (silkCatalogs.silk, silkCatalogs.silkPeers)
  // 2. Read plugin overrides (silkCatalogs.silkOverrides)
  // 3. Read plugin arrays (silkOnlyBuiltDependencies, silkPublicHoistPattern)
  // 4. Read existing config catalogs, overrides, and arrays
  // 5. Merge catalogs/overrides (local wins, emit warnings for conflicts)
  // 6. Merge arrays (combine + dedupe, no warnings)
  // 7. Return updated config with all merged fields
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
┌──────────────────────────────────────────────────────────────────────┐
│                     @savvy-web/pnpm-plugin-silk                       │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │  Catalog Defs    │  │  Hook Handlers       │  │  Patch Files  │  │
│  │  src/catalogs/   │  │  src/hooks/          │  │  patches/     │  │
│  │                  │  │  ├─ update-config.ts  │  │               │  │
│  │                  │  │  └─ warnings.ts       │  │               │  │
│  └────────┬─────────┘  └──────────┬───────────┘  └───────┬───────┘  │
│           │                       │                       │          │
│           └───────────┬───────────┴───────────────────────┘          │
│                       │                                               │
│                       ▼                                               │
│            ┌──────────────────────┐                                  │
│            │   rslib-builder      │                                  │
│            │   (CJS bundling)     │                                  │
│            └──────────┬───────────┘                                  │
│                       │                                               │
│                       ▼                                               │
│            ┌──────────────────────┐                                  │
│            │  dist/npm/           │                                  │
│            │  └── pnpmfile.cjs    │  (self-contained CJS bundle)     │
│            └──────────────────────┘                                  │
└──────────────────────────────────────────────────────────────────────┘
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

- `src/hooks/update-config.ts` - `updateConfig` hook with merge logic (synchronous)
- `src/hooks/warnings.ts` - Override detection and warning formatter
- `src/pnpmfile.ts` - Synchronous entry point (`module.exports = { hooks: { updateConfig } }`)

**Communication:** Called by pnpm during install lifecycle. The `updateConfig` hook is synchronous,
performing config merging and returning the merged config directly.

### Component Interactions

#### Interaction 1: Catalog and Override Injection During Install

**Participants:** pnpm, pnpmfile.cjs, Catalog Definitions

**Flow:**

1. User runs `pnpm install` in consuming repo
2. pnpm loads config dependency's `pnpmfile.cjs`
3. pnpm calls `updateConfig(currentConfig)`
4. Hook reads plugin catalog definitions and overrides
5. Hook merges catalogs with existing config (local wins)
6. Hook merges overrides with existing config (local wins)
7. Hook emits warnings for any conflicts
8. Hook returns modified config
9. pnpm uses merged catalogs and overrides for resolution

**Sequence diagram:**

```text
pnpm           pnpmfile.cjs    Catalogs
│                   │              │
├──────────────────>│              │  1. updateConfig(config)
│                   ├─────────────>│  2. getCatalogs() + getOverrides()
│                   │<─────────────┤  3. catalogData + overrideData
│                   │              │
│                   │ merge catalogs
│                   │ merge overrides
│                   │ emit warnings
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

When a local catalog entry or pnpm override conflicts with a Silk-managed version, emit prominent
console warnings:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  SILK CATALOG OVERRIDE DETECTED                                  │
├─────────────────────────────────────────────────────────────────────┤
│  The following entries override Silk-managed versions:              │
│                                                                     │
│  catalogs.silk.typescript                                           │
│    Silk version:  ^6.0.2                                            │
│    Local override: ^5.8.0                                           │
│                                                                     │
│  catalogs.silkPeers.vitest                                          │
│    Silk version:  ^2.0.0 || ^3.0.0                                  │
│    Local override: ^3.0.0                                           │
│                                                                     │
│  overrides.@isaacs/brace-expansion                                  │
│    Silk version:  >=5.0.1                                           │
│    Local override: >=5.0.0                                          │
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
- **Security awareness:** Alerts when local overrides may downgrade security fixes

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
  // Security overrides for transitive dependency CVEs
  silkOverrides: Record<string, string>;
  // Packages allowed to run build scripts during install
  silkOnlyBuiltDependencies: string[];
  // Packages to hoist to virtual store root
  silkPublicHoistPattern: string[];
}

// Example catalog definitions
const silkCatalogs: SilkCatalogs = {
  silk: {
    typescript: "^6.0.2",      // Current version for direct deps
    effect: "^3.21.0",
    react: "^19.2.5",
  },
  silkPeers: {
    typescript: "^6.0.0",      // Permissive range for peerDependencies
    effect: ">=3.21.0",
    react: "^19.2.0",
  },
  silkOverrides: {
    "@isaacs/brace-expansion": "^5.0.1",  // CVE-2026-25547
    "lodash": "^4.17.23",                 // CVE-2025-13465
    "tmp": "^0.2.4",                      // GHSA-52f5-9888-hmc6
  },
  silkOnlyBuiltDependencies: [
    "@parcel/watcher",         // Native file watcher
    "esbuild",                 // Native bundler
  ],
  silkPublicHoistPattern: [
    "typescript",              // IDE needs access
    "turbo",                   // Build orchestration
  ],
};

// Merge result - adds silk catalogs, overrides, and arrays
interface MergedConfig extends PnpmConfig {
  catalogs: {
    silk: Record<string, string>;       // current versions
    silkPeers: Record<string, string>;  // peer ranges
    [other: string]: Record<string, string>;
  };
  overrides: Record<string, string>;    // security overrides
  onlyBuiltDependencies: string[];      // build script allowlist (merged)
  publicHoistPattern: string[];         // hoist patterns (merged)
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
    typescript: "^6.0.2"                   "typescript": "catalog:silk"  ← uses ^6.0.2
    effect: "^3.21.0"                    },
  silkPeers:                             "peerDependencies": {
    typescript: "^6.0.0"                   "typescript": "catalog:silkPeers"  ← uses ^6.0.0
    effect: ">=3.21.0"                   }
                                       }
```

#### Flow 3: Local Override of Silk Catalog

```text
Plugin catalogs:                Local pnpm-workspace.yaml:
catalogs:                       catalogs:
  silk:                           silk:
    typescript: "^6.0.2"            typescript: "^5.8.0"  ← override
    effect: "^3.21.0"

                    │
                    ▼

Merged Result (used by pnpm):
catalogs:
  silk:
    typescript: "^5.8.0"  ← local wins
    effect: "^3.21.0"     ← from plugin
```

### State Management

The plugin is largely stateless--all catalog data is determined at hook invocation time.

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

**Data exchange:** TypeScript source → bundled CommonJS (self-contained CJS bundle)

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
      return updateConfig(config);
    },
  },
};
```

**Error handling:** Exceptions in hooks can break install; use try-catch with fail-safe defaults.

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
#     typescript: "^6.0.2"
#   silkPeers:
#     typescript: "^6.0.0"

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

**Current test count:** 27 tests across 3 describe blocks

**Test areas:**

- **silkCatalogs** (7 tests) - Catalog structure, build tools, testing tools, overrides, arrays
- **updateConfig** (17 tests) - Catalog merging, override warnings, array merging, deduplication
- **formatOverrideWarning** (3 tests) - Warning formatting, single/multiple overrides, guidance text

**Example test cases:**

```typescript
describe("mergeCatalogs", () => {
  it("merges silk catalog with local overrides", () => {
    const pluginSilk = { typescript: "^6.0.2", effect: "^3.21.0" };
    const localSilk = { typescript: "^5.8.0" };

    const result = mergeSilkCatalog(pluginSilk, localSilk);

    expect(result).toEqual({
      typescript: "^5.8.0", // local wins
      effect: "^3.21.0",    // from plugin
    });
  });

  it("provides both silk and silkPeers catalogs", () => {
    const config = updateConfig({ catalogs: {} });

    expect(config.catalogs.silk).toBeDefined();
    expect(config.catalogs.silkPeers).toBeDefined();
    expect(config.catalogs.silk.typescript).toBe("^6.0.2");
    expect(config.catalogs.silkPeers.typescript).toBe("^6.0.0");
  });

  it("adds silk overrides to config", () => {
    const config = updateConfig({});

    expect(config.overrides).toBeDefined();
    expect(config.overrides["@isaacs/brace-expansion"]).toBe(">=5.0.1");
    expect(config.overrides.lodash).toBe(">=4.17.23");
  });

  it("merges local overrides with silk overrides", () => {
    const config = updateConfig({
      overrides: { "custom-pkg": "^1.0.0" },
    });

    expect(config.overrides["custom-pkg"]).toBe("^1.0.0");
    expect(config.overrides["@isaacs/brace-expansion"]).toBe(">=5.0.1");
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

## Effect Ecosystem Version Strategy

The Silk plugin manages 24 Effect ecosystem packages across the `silk` and `silkPeers` catalogs,
providing centralized version control for Effect dependencies across all consuming repositories.
Version updates are managed via the [effect-catalog-resolver](#effect-catalog-resolver-skill)
Claude Code skill, which automates discovery, compatibility checking, and catalog updates.

### Effect Ecosystem Catalogs

The 24 managed Effect packages span seven functional groups:

**Core:**

- `effect` - The core Effect runtime (3.x, stable semver)
- `@effect/platform` - Cross-platform abstractions
- `@effect/platform-browser` - Browser platform implementation
- `@effect/platform-node` - Node.js platform implementation
- `@effect/platform-node-shared` - Shared Node.js platform utilities
- `@effect/platform-bun` - Bun platform implementation

**AI:**

- `@effect/ai` - AI provider abstractions
- `@effect/ai-amazon-bedrock` - Amazon Bedrock provider implementation
- `@effect/ai-anthropic` - Anthropic provider implementation
- `@effect/ai-google` - Google AI provider implementation
- `@effect/ai-openai` - OpenAI provider implementation

**CLI Tooling:**

- `@effect/cli` - CLI application framework
- `@effect/printer` - Pretty-printing combinators
- `@effect/printer-ansi` - ANSI terminal output

**Telemetry:**

- `@effect/opentelemetry` - OpenTelemetry integration

**Foundational:**

- `@effect/typeclass` - Typeclass definitions
- `@effect/language-service` - TypeScript language service plugin
- `@effect/experimental` - Experimental features and APIs

**Data/SQL:**

- `@effect/sql` - SQL database abstractions
- `@effect/sql-pg` - PostgreSQL implementation
- `@effect/sql-sqlite-bun` - SQLite Bun implementation
- `@effect/sql-sqlite-node` - SQLite Node.js implementation

**Platform Peers:**

- `@effect/cluster` - Distributed clustering
- `@effect/rpc` - Remote procedure calls
- `@effect/workflow` - Workflow orchestration

### Range Strategy for 0.x Packages

For `@effect/*` packages (all currently at 0.x), the `silkPeers` catalog uses `>=` floor-only
ranges instead of the standard `^` caret ranges used for most other packages. This is a deliberate
choice driven by how semver handles pre-1.0 versions:

- **`^0.x.y` in semver** means `>=0.x.y <0.(x+1).0`, which restricts updates to patch-only. If the
  `silk` catalog pins `@effect/platform` at `0.88.0` and the `silkPeers` catalog used `^0.87.0`,
  the peer range would resolve to `>=0.87.0 <0.88.0`, which would NOT overlap with the silk version
  one minor ahead. This breaks the fundamental contract that `silkPeers` ranges must always include
  the `silk` pinned version.

- **`>=0.x.y` (floor-only)** avoids the upper bound entirely, allowing any version at or above the
  floor. This ensures forward compatibility as new Effect versions are released.

This convention matches the Effect ecosystem's own established pattern. For example,
`github-action-effects` declares `@effect/platform: >=0.94.0` as a peer dependency.

For `effect` itself (currently at 3.x), the standard `^` caret range works correctly because
`^3.x.y` means `>=3.x.y <4.0.0`, which provides the expected minor+patch flexibility.

### Coordinated Releases

Effect packages are released in coordinated batches where all packages in a release share
compatible versions. A release of `effect@3.15.0` will be accompanied by corresponding compatible
versions of all `@effect/*` packages.

When updating the silk catalogs, all 24 Effect package entries should be updated together as a
single batch to maintain cross-package compatibility. The
[effect-catalog-resolver](#effect-catalog-resolver-skill) skill automates this process by resolving
a compatible version set anchored on the latest `effect` core release. Updating a subset of Effect
packages independently risks version incompatibilities between the Effect modules.

### Version Management

All 24 Effect packages are added as `devDependencies` in `pnpm-plugin-silk`'s own `package.json`
using `catalog:silk` references. This enables the standard version update workflow:

```bash
pnpm up -i -r --latest
```

Running this command updates the pinned versions in `pnpm-workspace.yaml`, which are then picked up
by the `generate:catalogs` script during the next build. The updated versions propagate to all
consuming repositories on the next plugin release.

This approach ensures that the plugin's own dependency resolution validates that all 24 Effect
packages resolve to compatible versions before they are published to consumers.

### Excluded Effect Packages

Selected Effect packages have special handling:

- **`@effect/vitest`** - Included in `silkPeers` only (not in `silk`). Each repository manages its
  own test framework version via local dependencies, but the peer range is provided for packages
  that declare it as a peer dependency.

- **`@effect/schema`** - Excluded entirely because its functionality was merged into the `effect`
  core package. No repositories in the Savvy Web ecosystem use `@effect/schema` as a standalone
  dependency.

---

## Effect Catalog Resolver Skill

The effect-catalog-resolver is a Claude Code skill (`.claude/skills/effect-catalog-resolver/`) that
automates the discovery, compatibility resolution, and catalog update workflow for all Effect
ecosystem packages. It replaces manual version coordination with a deterministic, script-driven
approach.

### Architecture

The skill consists of two components:

1. **SKILL.md** - Agent workflow instructions defining the interaction protocol (report presentation,
   approval flow, edit formatting)
2. **resolve-effect-versions.ts** - A ~445-line TypeScript script (runs via Bun) that performs all
   discovery, resolution, and output generation

The key design decision was to use a **script-driven approach** (deterministic resolution) rather
than an **agent-driven approach** (LLM reasoning about versions). Version compatibility is a
constraint-satisfaction problem with well-defined rules, making deterministic resolution more
reliable and reproducible than LLM inference.

### Resolution Pipeline

The script executes a four-stage pipeline:

```text
[1. Discovery]                    [2. Metadata Fetch]
npm registry search API           Full packument for each package
+ current catalog entries    -->  Per-version peer deps stored
= complete package list           for constraint walking

[3. Version Resolution]           [4. Output Generation]
Anchor on effect@latest           Compare resolved vs current
Iterative constraint solving -->  Classify: tracked/untracked/conflict
(up to 5 passes)                  Derive silkPeers minimums
Cross-package peer dep checks     Structured JSON to stdout
```

**Stage 1 - Discovery:** Queries `https://registry.npmjs.org/-/v1/search?text=%40effect&size=250`
to find all `@effect/*` packages. Supplements with currently tracked packages to ensure nothing is
missed if the search API returns incomplete results. Always includes `effect` core.

**Stage 2 - Metadata Fetch:** For each discovered package, fetches the full packument from
`https://registry.npmjs.org/<pkg>`. Extracts per-version peer dependency data for all stable
(non-prerelease) versions. This per-version data is critical for walking back to compatible older
versions when the latest version has incompatible constraints.

**Stage 3 - Version Resolution:** Anchors on the latest `effect` core version. Packages without
Effect peer dependencies are resolved to their latest version immediately. Packages with Effect
peer dependencies enter an iterative resolution loop (maximum 5 passes) that:

- Attempts to use each package's latest version if compatible with the current resolved set
- Falls back to `findCompatibleVersion()` which walks backwards through stable versions testing
  peer dep satisfaction
- Removes packages from the resolved set if no compatible version exists
- Converges when no changes occur in a pass

After convergence, any packages still failing compatibility checks are reported as conflicts with
their blocker details and best-available compatible version (if any).

**Stage 4 - Output Generation:** Compares resolved versions against current `pnpm-workspace.yaml`
catalog entries. Derives `silkPeers` minimums from peer dependency floor analysis (lowest floor
across all packages that peer-depend on a given package). Classifies packages as tracked (in
current catalogs), untracked (discovered but not in catalogs), or conflicted.

### Version Range Strategy

The resolver applies the same range conventions documented in the
[Range Strategy for 0.x Packages](#range-strategy-for-0x-packages) section:

- **silk catalog:** `^x.y.z` for all Effect packages (caret range)
- **silkPeers catalog:** `>=x.y.z` for `@effect/*` 0.x packages (floor-only range), `^x.y.z` for
  `effect` core (3.x, where caret works correctly)

The `silkPeers` minimum for each package is derived from the lowest peer dependency floor declared
by any other resolved package. For example, if `@effect/cli@0.75.0` declares
`@effect/platform: ">=0.96.0"` as a peer dependency, then the silkPeers entry for
`@effect/platform` will be at least `>=0.96.0`.

### Agent Workflow

When the skill is invoked:

1. The agent runs the resolution script with a 60-second timeout
2. The script outputs structured JSON to stdout (diagnostics go to stderr)
3. The agent presents a report with three sections:
   - **Updates Available** - Table of tracked packages with version changes
   - **New Packages** - Untracked `@effect/*` packages (informational only)
   - **Conflicts** - Incompatible packages with blocker details
4. On user approval, the agent edits `pnpm-workspace.yaml` using the Edit tool
5. Formatting is preserved: silk entries use bare values (`^0.75.0`), silkPeers Effect entries use
   quoted values (`">=0.74.0"`)
6. Only already-tracked packages are updated; untracked packages are shown as informational

### Design Decisions

#### Decision 1: Script-Driven vs. Agent-Driven Resolution

**Context:** Need to resolve compatible Effect ecosystem versions for catalog updates.

**Options considered:**

1. **Option A (Chosen): Deterministic TypeScript script**
   - Pros: Reproducible results, fast execution, testable, no LLM token cost for resolution logic
   - Cons: Requires maintaining resolution algorithm, less flexible for edge cases
   - Why chosen: Version compatibility is a constraint-satisfaction problem best solved
     deterministically

2. **Option B: Agent reasons about versions using npm CLI**
   - Pros: Flexible, can handle novel situations, no script maintenance
   - Cons: Non-deterministic, slow (multiple LLM turns), expensive, error-prone for constraint
     solving
   - Why rejected: LLMs are not reliable at semver constraint satisfaction

#### Decision 2: npm Registry HTTP API vs. npm CLI

**Context:** Need to discover packages and fetch metadata.

**Options considered:**

1. **Option A (Chosen): Direct HTTP API calls**
   - Pros: Faster (single packument fetch per package), full per-version data, no CLI overhead
   - Cons: Must handle HTTP errors, parse JSON manually
   - Why chosen: Per-version peer deps from packument data are essential for the resolution
     algorithm; npm CLI does not expose this data efficiently

2. **Option B: `npm view` and `npm search` CLI commands**
   - Pros: Simpler interface, handles authentication
   - Cons: Multiple CLI invocations, limited per-version data, slow
   - Why rejected: Cannot efficiently access per-version peer dependency data

#### Decision 3: Iterative Resolution with Fixed Iteration Cap

**Context:** Cross-package dependencies can create circular resolution needs.

**Why 5 iterations:** Effect packages typically have shallow dependency chains (most depend only on
`effect` core and possibly `@effect/platform`). In practice, resolution converges in 1-2 passes.
The cap of 5 provides safety margin without risk of infinite loops.

---

## Future Enhancements

### Phase 1: MVP (v1.0.0) - COMPLETE

- **Catalog management** - Core catalog merging via updateConfig hook
- **CJS bundling** - Add CJS output support to rslib-builder
- **Initial catalogs** - Define versions for Silk ecosystem modules

### Phase 2: Security Overrides (v1.1.0) - COMPLETE

- **Override management** - Centralize `overrides` field for transitive dependency resolution
- **Security response** - When a CVE is discovered in a transitive dependency, push a fix to all
  consuming repos by updating the plugin
- **Override warnings** - Similar to catalog warnings, alert when local overrides conflict

**Implementation Details:**

The `silkOverrides` catalog is read from `pnpm-workspace.yaml`'s `overrides` section and merged
into consuming repositories via the `updateConfig` hook. Current security overrides:

```yaml
# pnpm-workspace.yaml (plugin source)
overrides:
  "@isaacs/brace-expansion": "^5.0.1"   # CVE-2026-25547
  lodash: "^4.17.23"                    # CVE-2025-13465
  markdown-it: "^14.1.1"               # Security fix
  minimatch: ">=10.2.3"                # Security fix
  smol-toml: ">=1.6.1"                 # Security fix
  tmp: "^0.2.4"                         # GHSA-52f5-9888-hmc6
```

The `mergeOverrides()` function handles merging with local overrides, where local entries take
precedence but emit warnings for conflicts.

### Phase 3: Biome Schema Sync (v0.4.0) - REMOVED

- **Status:** Removed in v0.12.0. This functionality was migrated to `@savvy-web/lint-staged`,
  which is better positioned to handle Biome configuration since it already manages the linting
  pipeline.
- **What was removed:** `src/hooks/sync-biome-schema.ts`, `types/parse-gitignore.d.ts`,
  `jsonc-parser` and `parse-gitignore` dependencies
- **Impact:** The `updateConfig` hook in `pnpmfile.ts` is now synchronous (no longer async),
  simplifying the hook entry point. Bundle size decreased significantly with the removal of
  bundled third-party libraries.

### Phase 4: Effect Catalog Resolver (v0.5.0) - COMPLETE

- **Automated version resolution** - Claude Code skill that discovers all Effect ecosystem packages
  from the npm registry, resolves a compatible latest version set, and proposes catalog updates
- **Script-driven approach** - Deterministic TypeScript resolution script (~445 lines, runs via Bun)
  rather than LLM-driven version reasoning
- **Per-version peer dep analysis** - Fetches full packument data to enable walking back to
  compatible older versions when latest has incompatible constraints
- **Iterative constraint solving** - Up to 5 resolution passes to handle cross-package dependencies
- **silkPeers derivation** - Automatically derives minimum peer ranges from peer dependency floor
  analysis across all resolved packages

**Implementation Details:**

The skill lives at `.claude/skills/effect-catalog-resolver/` with two files:

- `SKILL.md` - Agent workflow definition (report format, approval flow, edit formatting rules)
- `scripts/resolve-effect-versions.ts` - Resolution script with four-stage pipeline: discovery,
  metadata fetch, version resolution, and output generation

The resolver uses the npm registry HTTP API directly (`registry.npmjs.org`) rather than the npm CLI,
enabling efficient access to per-version peer dependency data from packument responses. Output is
structured JSON consumed by the agent for report presentation and `pnpm-workspace.yaml` editing.

Current catalog state: 24 tracked Effect packages (expanded from initial 13), all at latest
compatible versions anchored on `effect@3.21.0`. Includes packages across core, AI (anthropic,
openai, amazon-bedrock, google), CLI, telemetry, SQL, and platform groups.

### Phase 5: Patch Distribution (v1.2.0)

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

### Phase 6: Advanced Features (v2.0.0)

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

**Claude Code Skills:**

- `.claude/skills/effect-catalog-resolver/SKILL.md` - Effect version resolution workflow
- `.claude/skills/effect-catalog-resolver/scripts/resolve-effect-versions.ts` - Resolution script

**Package Documentation:**

- `README.md` - Package overview and usage instructions
- `CLAUDE.md` - Development guide for contributors

**External Resources:**

- [pnpm Config Dependencies](https://pnpm.io/config-dependencies) - Official config dependency docs
- [pnpm Catalogs](https://pnpm.io/catalogs) - Catalog feature documentation
- [pnpm Hooks (pnpmfile)](https://pnpm.io/pnpmfile) - Hook API reference
- [pnpm Workspace Configuration](https://pnpm.io/pnpm-workspace_yaml) - Workspace YAML reference

---

**Document Status:** Current (95% complete) - MVP + Security Overrides + Effect Catalog Resolver
complete; Biome Schema Sync removed (migrated to @savvy-web/lint-staged)

**Synced:** 2026-04-14

**Implementation Summary:**

- Package structure created at repo root (single package, not monorepo)
- Rslib virtualEntries feature (v0.10.0) used for CJS bundling
- Catalog generation from `pnpm-workspace.yaml` implemented
- `updateConfig` hook with override warnings implemented (synchronous)
- Security overrides syncing from `pnpm-workspace.yaml` `overrides` section
- `mergeOverrides()` function with local precedence and conflict warnings
- `onlyBuiltDependencies` array syncing with deduplication
- `publicHoistPattern` array syncing with deduplication
- `mergeStringArrays()` function for combining and deduplicating arrays
- Effect catalog resolver skill (`.claude/skills/effect-catalog-resolver/`) for automated version
  resolution via npm registry API, iterative constraint solving, and silkPeers derivation
- 24 Effect ecosystem packages tracked in silk/silkPeers catalogs (expanded from 13 via resolver)
- Non-Effect catalog entries: react, react-dom, @types/react, @types/react-dom, TypeScript 6.x
- 27 unit tests passing (7 catalog + 17 config merge + 3 warning format)

**Build Output:**

- `dist/npm/pnpmfile.cjs` - Self-contained CJS bundle
- `dist/npm/index.js` - ESM public API
- `dist/npm/index.d.ts` - Type declarations

**Current Security Overrides:**

| Package | Minimum Version | CVE/Advisory |
| :------ | :-------------- | :----------- |
| `@isaacs/brace-expansion` | `^5.0.1` | CVE-2026-25547 |
| `lodash` | `^4.17.23` | CVE-2025-13465 |
| `markdown-it` | `^14.1.1` | Security fix |
| `minimatch` | `>=10.2.3` | Security fix |
| `smol-toml` | `>=1.6.1` | Security fix |
| `tmp` | `^0.2.4` | GHSA-52f5-9888-hmc6 |

**Current onlyBuiltDependencies:**

| Package | Reason |
| :------ | :----- |
| `@parcel/watcher` | Native file watcher with platform-specific binaries |
| `@savvy-web/changesets` | Build-time dependency |
| `@savvy-web/commitlint` | Build-time dependency |
| `@savvy-web/github-action-builder` | Build-time dependency |
| `@savvy-web/lint-staged` | Build-time dependency |
| `@savvy-web/vitest` | Build-time dependency |
| `better-sqlite3` | Native SQLite bindings |
| `core-js` | Polyfill compilation |
| `esbuild` | Native bundler with platform-specific binaries |
| `msgpackr-extract` | Native binary extraction |

**Current publicHoistPattern:**

| Package | Reason |
| :------ | :----- |
| `@changesets/cli` | CLI needs direct access |
| `@commitlint/cli` | CLI needs direct access |
| `@commitlint/config-conventional` | Commitlint plugin loading |
| `@commitlint/cz-commitlint` | Commitizen adapter |
| `@rslib/core` | Build tool needs direct access |
| `@types/bun` | Type definitions need direct access |
| `@types/node` | Type definitions need direct access |
| `@types/react` | Type definitions need direct access |
| `@types/react-dom` | Type definitions need direct access |
| `@typescript/native-preview` | TypeScript native preview access |
| `@vitest/coverage-v8` | Test coverage needs direct access |
| `commitizen` | CLI needs direct access |
| `husky` | Git hooks need direct access |
| `lint-staged` | CLI needs direct access |
| `markdownlint-cli2` | CLI needs direct access |
| `markdownlint-cli2-formatter-codequality` | Formatter plugin loading |
| `tsx` | TypeScript execution needs direct access |
| `turbo` | Build orchestration needs direct access |
| `typescript` | IDE and build tools need direct access |
| `vitest` | Test runner needs direct access |
| `vitest-agent-reporter` | Vitest reporter plugin loading |

**Next Steps:**

1. Phase 5: Add patch distribution
2. Continue expanding catalog entries as ecosystem grows
