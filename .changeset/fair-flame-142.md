---
"@savvy-web/pnpm-plugin-silk": minor
---

## Features

Add 14 Effect ecosystem packages to silk and silkPeers catalogs for centralized
version management: effect, @effect/platform, @effect/platform-node,
@effect/platform-bun, @effect/cli, @effect/opentelemetry, @effect/printer,
@effect/printer-ansi, @effect/typeclass, @effect/vitest,
@effect/language-service, @effect/cluster, @effect/rpc, @effect/sql.

silkPeers uses >= floor ranges for 0.x @effect/* packages to correctly handle
semver caret behavior on pre-1.0 versions.
