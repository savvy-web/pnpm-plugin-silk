# Effect Ecosystem Catalogs Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development
> (if subagents available) or superpowers:executing-plans to implement this plan.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 14 Effect ecosystem packages to silk and silkPeers catalogs.

**Architecture:** Update `pnpm-workspace.yaml` with new catalog entries, run the
existing generation pipeline (`generate:catalogs`) to produce TypeScript, then
validate with install, test, and build.

**Tech Stack:** pnpm, YAML, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-17-effect-ecosystem-catalogs-design.md`

---

## Task 1: Add Effect packages to pnpm-workspace.yaml

**Files:**

- Modify: `pnpm-workspace.yaml` (catalogs.silk and catalogs.silkPeers sections)

- [ ] **Step 1: Add entries to catalogs.silk**

Add these 14 entries to the `catalogs.silk` section in `pnpm-workspace.yaml`,
maintaining alphabetical sort order among all entries:

```yaml
catalogs:
  silk:
    "@effect/cli": ^0.74.0
    "@effect/cluster": ^0.57.0
    "@effect/language-service": ^0.80.0
    "@effect/opentelemetry": ^0.62.0
    "@effect/platform": ^0.95.0
    "@effect/platform-bun": ^0.88.0
    "@effect/platform-node": ^0.105.0
    "@effect/printer": ^0.48.0
    "@effect/printer-ansi": ^0.48.0
    "@effect/rpc": ^0.74.0
    "@effect/sql": ^0.50.0
    "@effect/typeclass": ^0.39.0
    "@effect/vitest": ^0.28.0
    "@types/node": ^25.5.0
    "@typescript/native-preview": 7.0.0-dev.20260317.1
    effect: ^3.20.0
    husky: ^9.1.7
    tsx: ^4.21.0
    typescript: ^5.9.3
```

- [ ] **Step 2: Add entries to catalogs.silkPeers**

Add these 14 entries to the `catalogs.silkPeers` section. Note: `effect` (3.x)
uses `^` caret range; all `@effect/*` packages (0.x) use `>=` floor-only ranges:

```yaml
  silkPeers:
    "@effect/cli": ">=0.73.0"
    "@effect/cluster": ">=0.56.0"
    "@effect/language-service": ">=0.79.0"
    "@effect/opentelemetry": ">=0.61.0"
    "@effect/platform": ">=0.94.0"
    "@effect/platform-bun": ">=0.87.0"
    "@effect/platform-node": ">=0.104.0"
    "@effect/printer": ">=0.47.0"
    "@effect/printer-ansi": ">=0.47.0"
    "@effect/rpc": ">=0.73.0"
    "@effect/sql": ">=0.49.0"
    "@effect/typeclass": ">=0.38.0"
    "@effect/vitest": ">=0.27.0"
    "@types/node": ^25.2.0
    "@typescript/native-preview": ^7.0.0-dev.20260124.1
    effect: ^3.19.0
    husky: ^9.1.0
    tsx: ^4.21.0
    typescript: ^5.9.3
```

- [ ] **Step 3: Verify YAML syntax**

Run: `node -e "const y=require('yaml');const fs=require('fs');y.parse(fs.readFileSync('pnpm-workspace.yaml','utf8'));console.log('YAML valid')"`

Expected: `YAML valid`

- [ ] **Step 4: Run pnpm install to validate catalog entries resolve**

Run: `pnpm install`

Expected: Clean install. Catalog entries are declarations for downstream
consumers, not actual dependencies of this workspace, so install should succeed.
If it errors on unresolved catalogs, defer the commit to after Task 2 validation.

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat: add Effect ecosystem packages to silk catalogs

Add 14 Effect packages to both silk and silkPeers catalogs:
effect, @effect/platform, @effect/platform-node, @effect/platform-bun,
@effect/cli, @effect/opentelemetry, @effect/printer, @effect/printer-ansi,
@effect/typeclass, @effect/vitest, @effect/language-service,
@effect/cluster, @effect/rpc, @effect/sql.

silkPeers uses >= floor ranges for 0.x @effect/* packages to avoid
non-overlapping caret range issues with 0.x semver.

Closes #73

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

## Task 2: Regenerate catalogs and validate

**Files:**

- Auto-generated: `src/catalogs/generated.ts` (via `pnpm run generate:catalogs`)

- [ ] **Step 1: Regenerate catalogs**

Run: `pnpm run generate:catalogs`

Expected output should include:

```text
Found 19 entries in silk catalog
Found 19 entries in silkPeers catalog
```

(5 existing + 14 new = 19 entries per catalog)

- [ ] **Step 2: Verify generated.ts contains Effect entries**

Spot-check that `src/catalogs/generated.ts` contains all 14 Effect packages in
both the `silk` and `silkPeers` sections. Verify:

- `effect: "^3.20.0"` in silk
- `effect: "^3.19.0"` in silkPeers
- `"@effect/platform": ">=0.94.0"` in silkPeers (uses `>=` not `^`)

- [ ] **Step 3: Run lint fix on generated file**

Run: `pnpm run lint:fix`

Expected: Clean (the generator may produce slightly different formatting than
Biome expects).

- [ ] **Step 4: Run tests**

Run: `pnpm run test`

Expected: All 51 tests pass. Tests use mocked catalogs, so the new generated
entries do not affect test behavior.

- [ ] **Step 5: Run build**

Run: `pnpm run build`

Expected: Clean build. The generated `dist/npm/pnpmfile.cjs` bundle should
include the new Effect catalog entries.

- [ ] **Step 6: Commit**

```bash
git add src/catalogs/generated.ts
git commit -m "chore: regenerate catalogs with Effect packages

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```

---

## Task 3: Create changeset

- [ ] **Step 1: Create changeset**

Create a changeset for the minor version bump:

```bash
pnpm changeset add --message "feat: add Effect ecosystem packages to silk catalogs" --type minor
```

Or manually create `.changeset/<name>.md`:

```markdown
---
"@savvy-web/pnpm-plugin-silk": minor
---

Add 14 Effect ecosystem packages to silk and silkPeers catalogs for centralized
version management: effect, @effect/platform, @effect/platform-node,
@effect/platform-bun, @effect/cli, @effect/opentelemetry, @effect/printer,
@effect/printer-ansi, @effect/typeclass, @effect/vitest,
@effect/language-service, @effect/cluster, @effect/rpc, @effect/sql.
```

- [ ] **Step 2: Commit changeset**

```bash
git add .changeset/
git commit -m "chore: add changeset for Effect catalogs

Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>"
```
