# Phase 1 Findings — reference-app verification (2026-08-25)

Verified stack: Ionic React **9.0.0** · React **19.2** · Vite **8.2** · TypeScript **7.0** · Capacitor **8.5.0** · `@capawesome/capacitor-electron` **0.1.0** (Electron **43.4**)

## Verification results

| Target | Result | Artifact |
|---|---|---|
| Web dev/build | ✅ | `dist/` (relative paths via `base: './'`), build ~0.5s |
| Android | ✅ | `android/app/build/outputs/apk/debug/app-debug.apk` (4.3 MB debug) |
| Desktop | ✅ | `electron/dist/win-unpacked/Ionic Everywhere Reference.exe` |
| One-shot sync | ✅ | `bun run sync` = build + `cap sync android` + `cap sync @capawesome/capacitor-electron` |

## Gotchas discovered (must inform CLI design)

1. **Ionic CLI hangs non-interactively** (`ionic start` blocked past 5 min even with
   `--no-interactive`, likely the account/telemetry prompt). Our CLI hand-rolls the
   project instead — no dependency on `@ionic/cli`. This is a feature.
2. **Bun `add` can rewrite package.json dropping custom fields** (observed with
   bun 1.4-canary). Templates must always ship a *complete* package.json; never
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
