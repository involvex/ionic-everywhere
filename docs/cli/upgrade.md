# `ionic-everywhere upgrade`

Bring a previously generated project's tooling up to the current template — without touching your code.

```bash
cd my-app && ionic-everywhere upgrade --yes
ionic-everywhere upgrade --dry-run   # print the plan, change nothing
```

## Usage

```
ionic-everywhere upgrade [--dir <path>] [--pm <bun|npm|pnpm|yarn>] [--dry-run] [--force] [--yes]
```

## What it does

1. **Scripts re-sync** — restores pruned or drifted scripts from the canonical registry.
2. **Workspaces pointer** — ensures the `electron` workspace entry exists when desktop is present.
3. **DevTools hook** — ensures the Electron live-reload DevTools hook is injected (skips user-customized configs).
4. **New template files** — copies template files that are missing in the target (never overwrites existing files; your `src/**` stays safe).
5. **Token-drift scan** — reports leftover `__APP_*__` tokens (report-only).
6. **Manifest refresh** — bumps `generatorVersion` to the running CLI version.

Explicit non-goals: no dependency version bumps, no regeneration of `android/` or `electron/` natives (that remains `cap sync` / [`add`](/cli/add)).

Projects created before the manifest existed are adopted automatically: options are inferred from `package.json` + `capacitor.config.ts`, a schema-1 manifest is written, and the upgrade proceeds. A dirty git tree produces a warning before anything is mutated.
