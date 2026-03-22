---
name: effect-catalog-resolver
description: >-
  Resolve latest compatible versions for Effect ecosystem packages in silk
  catalogs. Use when: updating effect packages, checking effect version
  compatibility, adding new @effect/* packages to catalogs. Discovers all
  @effect/* packages from npm, resolves peer dependency constraints, and
  proposes updates to pnpm-workspace.yaml.
tools: Bash, Read, Edit
---

# Effect Catalog Resolver

Resolves the latest compatible set of `effect` + `@effect/*` package versions
for the silk and silkPeers catalogs in `pnpm-workspace.yaml`.

## Workflow

1. Run the resolution script:

   ```bash
   bun .claude/skills/effect-catalog-resolver/scripts/resolve-effect-versions.ts
   ```

   Set a 60-second timeout. If the script fails (exit code 1), read the `error`
   field in the JSON output and report it to the user.

2. Parse the JSON output and present a report with three sections:

   **Updates Available** — Table of tracked packages with version changes:

   | Package | Current silk | Proposed silk | Current silkPeers | Proposed silkPeers |
   | --- | --- | --- | --- | --- |
   | effect | ^3.20.0 | ^3.21.0 | ^3.19.0 | >=3.20.0 |

   Only show packages where `changed` is `true`. If no changes, report
   "All Effect packages are up to date" and stop.

   **New Packages** — Untracked `@effect/*` packages discovered on npm:

   | Package | Latest | Description |
   | --- | --- | --- |

   These are informational only. Do not propose adding them automatically.

   **Conflicts** — Packages where the latest version is incompatible:

   | Package | Latest | Compatible | Blocker |
   | --- | --- | --- | --- |

   For each conflict, show the `compatibleVersion` (may be null) and `reason`.

3. Ask: "Apply these updates to pnpm-workspace.yaml?"

4. On approval, use the Edit tool to update the `catalogs.silk` and
   `catalogs.silkPeers` sections in `pnpm-workspace.yaml`. Preserve exact
   formatting — silk entries use bare values (e.g., `^0.75.0`), silkPeers
   Effect entries use quoted values (e.g., `">=0.74.0"`). Only update
   already-tracked packages.

5. After editing, suggest: "Run `pnpm install` to verify compatibility, then
   `pnpm run build` to regenerate catalogs."
