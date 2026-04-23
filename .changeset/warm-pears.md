---
"@savvy-web/pnpm-plugin-silk": patch
---

## Bug Fixes

Corrects the Effect catalog resolver's `deriveSilkPeers` function to use the lowest peer dependency floor instead of the highest. Previously, silkPeers ranges converged to match silk values, defeating the purpose of permissive peer ranges.

## Dependencies

| Dependency | Type | Action | From | To |
| :--- | :--- | :--- | :--- | :--- |
| effect | devDependency | updated | ^3.21.0 | ^3.21.2 |
| @effect/ai-openai | devDependency | updated | ^0.39.0 | ^0.39.2 |
| @effect/cli | devDependency | updated | ^0.75.0 | ^0.75.1 |
| @effect/cluster | devDependency | updated | ^0.58.0 | ^0.58.2 |
| @effect/platform | devDependency | updated | ^0.96.0 | ^0.96.1 |
| @effect/rpc | devDependency | updated | ^0.75.0 | ^0.75.1 |
| @effect/sql | devDependency | updated | ^0.51.0 | ^0.51.1 |
| @typescript/native-preview | devDependency | updated | ^7.0.0-dev.20260414.1 | 7.0.0-dev.20260422.1 |
| typescript | devDependency | updated | ^6.0.2 | ^6.0.3 |
