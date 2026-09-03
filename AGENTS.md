# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

`@involvex/ionic-everywhere` — a CLI that scaffolds **one responsive Ionic React codebase**
that builds to **Web + Android (Capacitor 8) + Desktop (@capawesome/capacitor-electron)**.
Binaries: `ionic-everywhere` and `create-ionic-everywhere` (same entry point).

## Repository layout

```
packages/ionic-everywhere/   The CLI (TypeScript -> dist/, bins in package.json)
  src/                       cli.ts (entry/dispatch), new.ts (scaffold flow),
                             scaffold.ts (copy+tokens), doctor.ts (env checks), util.ts
  templates/default/         The generated app template. Tokenized:
                             __APP_NAME__, __APP_ID__, __APP_NAME_KEBAB__
reference-app/               Hand-verified playground app (Phase 1). NOTES.md holds
                             verified-stack findings and gotchas. NOT part of the package.
tests/                       Vitest unit tests (import from packages/*/src directly)
```

## Commands

```powershell
bun install            # workspace install (root only)
bun run lint           # ESLint 9 flat config
bun run test           # vitest
bun run format         # prettier (shareable @involvex/prettier-config)
bun run verify         # format + lint:fix + test (also wired as prebuild)
bun run build          # tsc for packages/* (runs verify first via prebuild)
bun run cli:dev        # watch-build the CLI package
bun run cli:test       # build CLI, scaffold .test/demo-app end-to-end, assert output
```

There is no separate typecheck script; the CLI package's `build` runs `tsc`, which is
the type gate. Run `tsc -p packages/ionic-everywhere/tsconfig.json --noEmit` for a
type-only pass if needed.

## Environment facts (Windows dev machine)

- Shell is PowerShell; use PowerShell-compatible syntax (`Remove-Item -Recurse`, etc.)
- Package manager is **bun**. Do not use npm/pnpm/yarn commands locally.
- JDK: Android builds require JDK 21+. If the system `JAVA_HOME` points at an
  older JDK, set `$env:JAVA_HOME` to a JDK 21+ install when running
  gradle/cap android builds.
- A file watcher/formatter rewrites written files (single→double quotes, line breaks).
  ALWAYS `Read` a file immediately before any `Edit`.

## Hard-won gotchas (do not rediscover these)

1. **Never run plain `bun add` to change dependencies here** — it has rewritten
   package.json dropping name/scripts (observed on bun 1.4-canary). Edit
   `devDependencies` manually, then `bun install`.
2. **Ionic CLI (`ionic start`) hangs non-interactively.** Never use it in automation;
   the template is hand-maintained instead.
3. **Capacitor platform commands need the FULL name**: `cap sync @capawesome/capacitor-electron`.
   Bare `electron` silently resolves to the npm `electron` package and does nothing.
4. **Ionic React 9 routing**: `IonReactRouter`/`IonReactHashRouter` come from
   `@ionic/react-router` (not `@ionic/react`). RR6 `<Route>` has no `exact` prop.
5. **Vite config must keep `base: './'`** or assets break under Electron/Capacitor shells.
6. Template `package.json` uses canonical `npm run ...` chains; `scaffold()` rewrites
   them to the chosen package manager (`applyRunner`) and `prunePlatformScripts()`
   removes scripts for skipped platforms. Keep both in sync when editing template
   scripts — `android`/`desktop` rely on bun/npm `pre*` hooks for auto build+sync.
7. Reference-app mirrors the template's final (bun) shape so verification matches
   what users get. Port template changes there before committing them.
8. `electron/package.json` is owned by the Capawesome platform generator — never
   merge it into the app root. The CLI only injects a `workspaces: ["electron"]`
   pointer AFTER `cap add` runs (bun/npm fail on missing workspace dirs), then
   reinstalls from the root so there is a single lockfile.
9. **Template deps must be pure-JS or explicitly pinned.** `typescript` stays `^5.9.3`
   (TS7's native binary arrives via per-platform optionalDependencies that some bun
   versions silently skip). `react-router`/`react-router-dom` are direct deps —
   `@ionic/react-router` only peer-depends on them and bun doesn't auto-install peers.
   `vite-plugin-pwa` needs explicit `workbox-window`. All three rules are enforced by
   unit tests; don't remove them.
10. **bun canary is not supported for installs.** 1.4.0-canary.1 nondeterministically
    produced broken layouts (dropped vite's transitive `rolldown`, skipped all
    `os`/`cpu`-gated optionals). Stable bun (≥1.4.1) is required locally; the
    canonical script registry lives in `src/platform-scripts.ts` — edit scripts there
    (drift-guard test will fail if template and registry diverge).

## Changing the generated app

Workflow: prototype/verify changes in `reference-app/` first (it installs real deps and
can be built/synced against all three targets), then port the final source into
`templates/default/`, preserving the `__APP_*__` tokens in `package.json`,
`capacitor.config.ts` and `index.html`. Update `tests/scaffold.test.ts` expectations if
template content changed materially.

## Before you claim done

- [ ] `bun run verify` passes (lint + tests)
- [ ] `bun run build` passes
- [ ] If template changed: scaffold into a temp dir (`bun packages/ionic-everywhere/dist/cli.js new <tmp> --yes --no-git`)
      and confirm the output builds
