# `ionic-everywhere upgrade`

Bring a previously generated project's tooling up to the current template — without touching your code.

```bash
cd my-app && ionic-everywhere upgrade --yes
ionic-everywhere upgrade --dry-run        # print the plan, change nothing
ionic-everywhere upgrade --check-deps     # report dependency drift vs blessed registry
ionic-everywhere upgrade --deps           # apply safe patch/minor dependency bumps
```

## Usage

```
ionic-everywhere upgrade [--dir <path>] [--pm <bun|npm|pnpm|yarn>]
                         [--dry-run] [--force] [--yes]
                         [--check-deps] [--deps] [--allow-dirty]
```

## What it does

1. **Scripts re-sync** — restores pruned or drifted scripts from the canonical registry.
2. **Workspaces pointer** — ensures the `electron` workspace entry exists when desktop is present.
3. **DevTools hook** — ensures the Electron live-reload DevTools hook is injected (skips user-customized configs).
4. **New template files** — copies template files that are missing in the target (never overwrites existing files; your `src/**` stays safe).
5. **Token-drift scan** — reports leftover `__APP_*__` tokens (report-only).
6. **Manifest refresh** — bumps `generatorVersion` to the running CLI version.

## Dependency updates

Pass `--check-deps` to see how the project's `@capacitor/*`, `@ionic/*`, and related blessed dependencies compare to the template's pinned versions.

```bash
ionic-everywhere upgrade --check-deps
```

Output includes:

- **safe** entries (patch/minor): versions that can be bumped automatically.
- **manual** entries (major bumps): a checklist of required manual steps (native config, JDK/Gradle constraints, re-add guidance for `@capawesome/capacitor-electron`).
- **new** entries: blessed dependencies missing from the project.

`--check-deps` is report-only and safe to run in CI or non-interactive shells.

### Applying safe bumps (`--deps`)

```bash
ionic-everywhere upgrade --deps --yes
```

`--deps` applies only **patch** and **minor** version bumps to existing `package.json` ranges. It:

1. Edits `package.json` surgically (preserves existing formatting).
2. Runs `pm install` to fetch the new versions.
3. Runs `cap sync android` / `cap sync @capawesome/capacitor-electron` for each present platform.
4. Runs `typecheck` and `build` to verify the project still compiles.
5. Writes a `capVersions` snapshot into the manifest for future diffing.

**Major bumps are never applied automatically.** They appear as `manual` in the report with a copy-pasteable checklist. For `@capawesome/capacitor-electron` majors, the checklist includes backing up `electron/` customizations, removing the platform dir, and re-adding via `cap add @capawesome/capacitor-electron`.

## Safety

- `--deps` requires a clean git tree by default. If you have uncommitted changes, stage them or pass `--allow-dirty`.
- On post-verify failure, the CLI prints a rollback snippet (`git diff -- package.json`, `git checkout -- package.json`, reinstall).
- Non-interactive shells without `--yes`/`--dry-run`/`--check-deps` fail fast with actionable re-run flags.
- Existing files are never overwritten. `--deps` only edits `package.json` ranges and the manifest.

Explicit non-goals: no regeneration of `android/` or `electron/` natives (that remains `cap sync` / [`add`](/cli/add)).

Projects created before the manifest existed are adopted automatically: options are inferred from `package.json` + `capacitor.config.ts`, a schema-1 manifest is written, and the upgrade proceeds.
