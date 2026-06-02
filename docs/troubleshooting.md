# Troubleshooting

Common issues and solutions when using `@savvy-web/pnpm-plugin-silk`.

## Catalog entries not appearing

**Symptom:** Running `pnpm install` does not make `catalog:silk` or `catalog:silkPeers` entries available.

**Possible causes:**

1. The config dependency is not installed. Check your `pnpm-workspace.yaml`:

   ```yaml
   configDependencies:
     "@savvy-web/pnpm-plugin-silk": "npm:@savvy-web/pnpm-plugin-silk@<version>+sha512-..."
   ```

2. The version or integrity hash is incorrect. Run `pnpm add --config @savvy-web/pnpm-plugin-silk` to re-add it with the correct hash.

## Override warnings during install

**Symptom:** A warning box appears during `pnpm install` showing catalog overrides.

**Explanation:** Your local `pnpm-workspace.yaml` has catalog entries or overrides that differ from the Silk-managed versions. This is expected when you intentionally pin a different version.

**To resolve:**

- If the override is intentional, no action needed. The warning is informational.
- If you want to use the Silk default, remove the entry from your local `catalogs` or `overrides` section in `pnpm-workspace.yaml`.

## Security warning during install

**Symptom:** A security warning box appears during `pnpm install` referring to `strictDepBuilds`, `blockExoticSubdeps` or `minimumReleaseAge`.

**Explanation:** Your local `pnpm-workspace.yaml` weakens a Silk security default — for example, setting `strictDepBuilds: false`, setting `blockExoticSubdeps: false`, or setting `minimumReleaseAge` below the Silk default. The warning is printed every install to keep the relaxation visible.

**To resolve:**

- If the relaxation is intentional, no action needed. The warning is informational.
- To restore the Silk default, remove the relevant key from your local `pnpm-workspace.yaml`.

## Build fails after updating catalogs

**Symptom:** `pnpm run build` fails after modifying `pnpm-workspace.yaml`.

**Solution:** Run `pnpm run generate:catalogs` to regenerate the TypeScript catalog file from the updated workspace YAML, then rebuild:

```bash
pnpm run generate:catalogs
pnpm run build
```

Run `generate:catalogs` any time you update `pnpm-workspace.yaml` before building, since the catalog TypeScript file must match the workspace YAML.

## Dependency version conflicts

**Symptom:** A consuming repository gets unexpected dependency versions.

**Explanation:** Check whether the consuming repo has local catalog entries that override Silk values. The override warning during `pnpm install` shows all conflicts.

**To debug:**

1. Run `pnpm install` and look for the override warning box
2. Check your `pnpm-workspace.yaml` `catalogs` section for local entries
3. Remove local entries to use Silk defaults, or keep them to maintain your override
