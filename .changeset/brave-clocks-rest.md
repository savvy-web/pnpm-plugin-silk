---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

### `confirmModulesPurge` managed setting

Silk now injects `confirmModulesPurge: false` into the consuming workspace's pnpm config as a behavioral default. When pnpm considers purging the `node_modules` store, this setting suppresses the interactive confirmation prompt — keeping installs non-interactive in CI and scripted environments without requiring each repo to set it manually.

This is a plain behavioral default, not a security setting:

- A child workspace's own `confirmModulesPurge` value wins (child-wins merge via `mergeScalar`).
- No warning is emitted when the child value diverges. Repos that want interactive confirmation can set `confirmModulesPurge: true` in their own `pnpm-workspace.yaml`.

```yaml
# pnpm-workspace.yaml in a child repo — overrides Silk's default
confirmModulesPurge: true
```

If the child repo sets no value, Silk's `false` applies automatically.
