---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

### Generalized source-repo hoist exclusion

The plugin now uses a repo-to-packages map to exclude workspace-local packages from `publicHoistPattern` when the consuming repo is its own source monorepo. Previously only the `savvy-web-systems` repo (excluding `@savvy-web/cli` and `@savvy-web/mcp`) was handled. Now `vitest-agent` is also recognized, dropping `@vitest-agent/cli` and `@vitest-agent/mcp` from the hoist set inside that repo.

Consumer repos are unaffected — they continue to receive the full `publicHoistPattern` with all packages hoisted.

### Silk ships `allowedDeprecatedVersions` defaults

Silk now provides a baseline set of `allowedDeprecatedVersions` entries (`glob`, `inflight`, `prebuild-install`) so child workspaces inherit them without needing to declare them manually. The existing merge behavior (child value wins per key, no warning) is unchanged — child workspaces can override individual entries or add their own.

## Dependencies

| Dependency | Type | Action | From | To |
| :--------- | :--- | :------ | :--- | :- |
| effect | config | updated | ^3.21.3 | ^3.21.4 |
| @effect/platform | config | updated | ^0.96.1 | ^0.96.2 |
| @effect/ai-amazon-bedrock | config | updated | ^0.16.0 | ^0.16.1 |
| @effect/ai-openai | config | updated | ^0.40.0 | ^0.40.1 |
| @types/node | config | updated | ^25.9.3 | ^26.0.0 |
