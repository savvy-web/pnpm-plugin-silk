---
"@savvy-web/pnpm-plugin-silk": minor
---

Add security override support for transitive dependency CVEs

- Added `silkOverrides` to sync pnpm `overrides` configuration across consuming repos
- Security fixes included: `@isaacs/brace-expansion` (CVE-2026-25547), `lodash` (CVE-2025-13465), `tmp` (GHSA-52f5-9888-hmc6)
- Override warnings alert when local overrides diverge from Silk-managed versions
- Updated generator to read overrides from `pnpm-workspace.yaml`
