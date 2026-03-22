---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

Add effect-catalog-resolver skill and expand Effect ecosystem to 19 packages.

New Claude Code skill (`.claude/skills/effect-catalog-resolver/`) that discovers
all `@effect/*` packages from the npm registry, resolves the latest compatible
version set using peer dependency analysis, and proposes updates to
`pnpm-workspace.yaml` catalogs.

New tracked packages: `@effect/ai`, `@effect/ai-anthropic`, `@effect/ai-openai`,
`@effect/experimental`, `@effect/workflow`, `@effect/sql-sqlite-node`. All Effect
packages updated to latest compatible versions anchored on `effect@3.21.0`.
