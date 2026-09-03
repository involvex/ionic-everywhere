# Phase 1 Findings — reference-app verification (2026-08-25)

Verified stack: Ionic React **9.0.2** · React **19.2** · Vite **8.2** · TypeScript **5.9** · Capacitor **8.5.1** · `@capawesome/capacitor-electron` **0.1.1** (Electron **43.4**)

## Verification results

| Target        | Result | Artifact                                                                                |
| ------------- | ------ | --------------------------------------------------------------------------------------- |
| Web dev/build | ✅     | `dist/` (relative paths via `base: './'`), build ~0.5s                                  |
| Android       | ✅     | `android/app/build/outputs/apk/debug/app-debug.apk` (4.3 MB debug)                      |
| Desktop       | ✅     | `electron/dist/win-unpacked/Ionic Everywhere Reference.exe`                             |
| One-shot sync | ✅     | `bun run sync` = build + `cap sync android` + `cap sync @capawesome/capacitor-electron` |

## Gotchas discovered (must inform CLI design)

1. **Ionic CLI hangs non-interactively** (`ionic start` blocked past 5 min even with
   `--no-interactive`, likely the account/telemetry prompt). Our CLI hand-rolls the
   project instead — no dependency on `@ionic/cli`. This is a feature.
2. **Bun `add` can rewrite package.json dropping custom fields** (observed with
   bun 1.4-canary). Templates must always ship a _complete_ package.json; never
   rely on incremental edits during scaffolding.
3. **Ionic 9 + React Router 6 API changes:**
   - `IonReactRouter` / `IonReactHashRouter` / `IonReactMemoryRouter` are exported from
     **`@ionic/react-router`**, NOT `@ionic/react`.
   - RR6 `<Route>` has **no `exact` prop** (matching is exact by default).
   - Tabs pattern per v9 docs: parent `/tabs/*` route + relative child routes +
     `index` redirect. We use flat shared-URL routes under `IonTabs` which also works.
4. **Capacitor 8 requires JDK 21** for the Android Gradle build. JDK 17 fails with
   `error: invalid source release: 21`. The CLI `doctor` MUST check `JAVA_HOME`
   major version ≥ 21 and point users to a download link otherwise.
5. **Capawesome Electron platform specifics:**
   - Always use the FULL platform name: `cap sync @capawesome/capacitor-electron`.
     Bare `electron` silently resolves to the npm `electron` package and no-ops.
   - After `cap add`: `cd electron && <pm> install`, then sync copies web assets to
     `electron/app/`.
   - Packaging pipeline inside `electron/`: `tsc` → `capacitor-electron vendor` →
     `electron-builder --config electron-builder.config.js [--dir]`.
   - `--dir` produces unpacked app without launching GUI (good for CI).
6. **Adaptive layout pattern that works:**
   `IonApp > IonReactRouter > IonSplitPane(contentId="main-content") > [IonMenu, IonTabs]`,
   tab routes are flat shared URLs; CSS hides `ion-tab-bar` at `min-width: 992px`;
   menu items navigate identical paths via `routerLink`. Menu auto-shows as sidebar ≥ lg,
   drawer below.
7. **Vite `base: './'`** required so assets load under both Capacitor WebView and
   Electron protocol handler.
8. A file watcher/formatter may rewrite sources after write (quotes etc.) — harmless.

## Environment requirements for end users

- Node ≥ 20 (we tested on 22) or Bun ≥ 1.3
- JDK 21+ (`JAVA_HOME`) — Android builds only
- Android SDK (`ANDROID_HOME`) — Android builds only
- Nothing extra for desktop (Electron downloads on first package)

---

# Addendum — Phase 2 findings (2026-08-26)

9. **TypeScript 7 (native) is banned from the template.** `typescript@7.0.2` ships its
   binary via 20 per-platform `optionalDependencies`; bun 1.4.0-canary.1 recorded them
   in the lockfile but materialized **none** of the `os`/`cpu`-gated packages to disk,
   so every generated app crashed with `Unable to resolve @typescript/typescript-win32-x64`.
   Template + CLI now pin `typescript ^5.9.3` (pure-JS). Revisit TS7 only behind an
   explicit opt-in flag.
10. **`react-router` / `react-router-dom` MUST be direct deps** of generated apps:
    `@ionic/react-router@9` declares them as peerDependencies, and bun does not
    auto-install peers (npm does). Template pins both at `^6.30.6`.
11. **bun canary linker/installer nondeterminism:** 1.4.0-canary.1 produced a hoisted
    install that silently dropped vite's transitive `rolldown` (and all native
    optionals) from disk _and_ lockfile; minutes earlier it had produced a working
    isolated (`.bun` store) layout for the same project. Upgrading to stable bun
    **1.4.1** fixed installs completely — no dependency hacks needed. Prefer stable;
    if users report `Cannot find package 'rolldown'`, tell them to upgrade bun.
12. **PWA stack verified:** `vite-plugin-pwa@1.3.0` (supports Vite 8) +
    explicit `workbox-window ^7.4.1` devDep (optional peer — bun won't install it
    otherwise; build fails resolving `virtual:pwa-register` without it).
    `registerType: 'autoUpdate'`, relative manifest link confirmed with `base: './'`,
    SW registration is a no-op inside Capacitor/Electron WebViews (non-secure context).
13. **Icon/splash pipeline:** placeholder PNGs in `assets/` (1024/2732px) +
    `assets` script (`npx @capacitor/assets generate --android --assetPath assets`);
    PWA icons in `public/icons/`. Verified end-to-end via scaffold → build on Windows.
14. **`ionic-everywhere add <android|desktop>` verified e2e** (`scripts/cli-test-add.mjs`):
    cap add with FULL platform name → workspaces applied for electron → root reinstall →
    pruned scripts restored from `src/platform-scripts.ts` registry (single source of
    truth shared with the template; drift-guarded by unit test).
15. **FEAT-009 prototype (2026-08-26): desktop live-reload needs NO patching.**
    The Capawesome runtime (`@capawesome/capacitor-electron@0.1.0`,
    `dist/runtime/index.js`) natively supports a dev-server mode via
    `process.env.CAPACITOR_ELECTRON_DEV_SERVER_URL`:
    - loads that URL instead of the `capacitor-electron://` app origin,
    - installs a relaxed CSP for the dev origin (`config.csp.devPolicy` to override),
    - retries the load every 1s until Vite is up (`[capacitor-electron] Failed to
load ... retrying` on stderr while waiting).
      Verified live in reference-app: `bunx vite --port 5173 --strictPort` +
      `CAPACITOR_ELECTRON_DEV_SERVER_URL=http://localhost:5173 electron .`
      → 15s run, empty stdout/stderr (no retries, no CSP violations), process stable;
      negative control without the env var loaded the production bundle equally clean.
      Manual dev flow (two terminals):
      1. `bun run dev` # vite on :5173
      2. `cd electron && CAPACITOR_ELECTRON_DEV_SERVER_URL=http://localhost:5173 bun run start`
         Caveats: HMR websockets ride on the relaxed dev CSP; SW registration is a no-op
         in dev (vite-plugin-pwa `devOptions` disabled). A future `desktop:dev` one-liner
         would need a process manager dep (e.g. `concurrently`) — deferred to keep the
         template dep set lean.
         **Shipped (2026-08-26):** `desktop:dev` now ships with no extra dependency -
         `scripts/desktop-dev.mjs` spawns Vite itself (`node vite/bin/vite.js`, parsing
         the ANSI-decorated `Local:` URL), then launches Electron with
         `CAPACITOR_ELECTRON_DEV_SERVER_URL`; both die together on exit. DevTools
         auto-open via an idempotent CLI-injected `hooks.onWindowCreated` block in
         `electron/capacitor.electron.config.ts`, guarded by the same env var.
         Gotchas hit while building it: Vite's `exports` map does not expose
         `./bin/vite.js` (resolve by path), and its startup banner is ANSI-colored.
16. **Electron binaries need an explicit install under bun:** bun blocks lifecycle
    scripts by default, so `electron/dist/` never materializes after install
    (`electron.exe` missing). Fix inside the platform dir:
    `bun node_modules/electron/install.js`. Relevant for anyone debugging the
    desktop shell locally; npm users are unaffected (postinstall runs normally).
17. **"Unsupported class file major version 69" = Gradle ran on a too-new JVM**
    (class-file 69 = JDK 25; Gradle 8.x as bundled by Capacitor cannot load it).
    The project itself is fine - it is purely a JAVA_HOME/PATH resolution issue in
    the invoking shell. Verified: settings evaluation + full `assembleDebug` pass
    under JDK 17 and 21 on the very same app that failed under the newer JVM.
    Mitigations shipped: `scripts/gradle.mjs` now translates this signature into
    actionable advice, and `doctor` warns when the detected JDK is >= 24.
    Machine quirk worth remembering: `%USERPROFILE%\.jdks\openjdk-24.0.2` here is
    mislabeled and actually contains JDK 21.0.8 (nested `bin/bin` layout).
