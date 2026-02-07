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

## Biome schema not updating

**Symptom:** The `$schema` URL in `biome.json` or `biome.jsonc` does not
update to match the catalog version.

**Possible causes:**

1. **Missing `@savvy-web/lint-staged`** - Schema sync only activates when
   `@savvy-web/lint-staged` is declared as a dependency in the workspace root
   `package.json`.

2. **Non-standard schema URL** - The plugin only updates `$schema` URLs that
   start with `https://biomejs.dev/schemas/`. Custom URLs are left unchanged.

3. **File in ignored directory** - The plugin respects `.gitignore` patterns
   when searching for config files. Config files in `node_modules` or other
   ignored paths are skipped.

4. **Already at correct version** - If the `$schema` URL already matches the
   catalog version, no update is performed.

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
