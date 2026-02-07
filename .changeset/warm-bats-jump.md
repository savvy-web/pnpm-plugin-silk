---
"@savvy-web/pnpm-plugin-silk": minor
---

Add automatic Biome schema version synchronization

When `@savvy-web/lint-staged` is a workspace dependency, the plugin now
automatically updates `$schema` URLs in `biome.json`/`biome.jsonc` files to
match the catalog version of `@biomejs/biome`. Uses comment-preserving JSONC
edits via `jsonc-parser` and respects `.gitignore` patterns when searching for
config files via Node's built-in `fs.promises.glob`.
