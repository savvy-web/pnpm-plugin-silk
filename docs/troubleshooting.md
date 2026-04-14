# Troubleshooting

Common issues and solutions when using `@savvy-web/pnpm-plugin-silk`.

## Catalog entries not appearing

**Symptom:** Running `pnpm install` does not make `catalog:silk` or
`catalog:silkPeers` entries available.

**Possible causes:**

1. The config dependency is not installed. Check your `pnpm-workspace.yaml`:

   ```yaml
   configDependencies:
     "@savvy-web/pnpm-plugin-silk": "0.3.0+sha512-..."
   ```

2. The version or integrity hash is incorrect. Run
   `pnpm add --config @savvy-web/pnpm-plugin-silk` to re-add it with the
   correct hash.

## Override warnings during install

**Symptom:** A warning box appears during `pnpm install` showing catalog
overrides.

**Explanation:** Your local `pnpm-workspace.yaml` has catalog entries or
overrides that differ from the Silk-managed versions. This is expected when
you intentionally pin a different version.

**To resolve:**

- If the override is intentional, no action needed. The warning is
  informational.
- If you want to use the Silk default, remove the entry from your local
  `catalogs` or `overrides` section in `pnpm-workspace.yaml`.

## Build fails after updating catalogs

**Symptom:** `pnpm run build` fails after modifying `pnpm-workspace.yaml`.

**Solution:** Run `pnpm run generate:catalogs` to regenerate the TypeScript
catalog file from the updated workspace YAML, then rebuild:

```bash
pnpm run generate:catalogs
pnpm run build
```

Note that `pnpm run build` automatically runs `generate:catalogs` via the
`prebuild` script, so this should only be an issue if you are running
`build:dev` or `build:prod` directly.

## Dependency version conflicts

**Symptom:** A consuming repository gets unexpected dependency versions.

**Explanation:** Check whether the consuming repo has local catalog entries
that override Silk values. The override warning during `pnpm install` shows
all conflicts.

**To debug:**

1. Run `pnpm install` and look for the override warning box
2. Check your `pnpm-workspace.yaml` `catalogs` section for local entries
3. Remove local entries to use Silk defaults, or keep them to maintain
   your override
