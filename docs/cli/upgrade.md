# `ionic-everywhere upgrade`

Bring a previously generated project's tooling up to the current template — without touching your code.

```bash
cd my-app && ionic-everywhere upgrade --yes
ionic-everywhere upgrade --dry-run        # print the plan, change nothing
ionic-everywhere upgrade --check-deps     # report dependency drift vs blessed registry
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

- **safe** entries (patch/minor): versions that can be bumped automatically in a future release.
- **manual** entries (major bumps): a checklist of required manual steps (native config, JDK/Gradle constraints, re-add guidance for `@capawesome/capacitor-electron`).
- **new** entries: blessed dependencies missing from the project.

`--check-deps` is report-only and safe to run in CI or non-interactive shells.

`--deps` currently behaves the same as `--check-deps` (Phase 1: report-only). Safe patch/minor application will land in Phase 2.

## Safety

- A dirty git tree produces a warning before anything is mutated (pass `--allow-dirty` to override).
- Non-interactive shells without `--yes`/`--dry-run`/`--check-deps` fail fast with actionable re-run flags.
- Existing files are never overwritten except for surgical `package.json` JSON edits (future `--deps` applier).

Explicit non-goals: no dependency version bumps in v1 without `--check-deps`/`--deps`, no regeneration of `android/` or `electron/` natives (that remains `cap sync` / [`add`](/cli/add)).

Projects created before the manifest existed are adopted automatically: options are inferred from `package.json` + `capacitor.config.ts`, a schema-1 manifest is written, and the upgrade proceeds.
