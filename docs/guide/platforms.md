# Platforms

## Android (Capacitor 8)

- Requires JDK **21+** and the Android SDK (`ANDROID_HOME`). Run [`doctor`](/cli/doctor) first — it fails with actionable advice when `JAVA_HOME` points at an older JDK.
- The native project lives in `android/` after scaffolding. Sync web changes into it with `bun run sync` (or let the `android` command do it via its `pre*` hook).
- Open the project in Android Studio with `bun run open:android`.
- Debug APK: `bun run build:android` → `android/app/build/outputs/apk/debug/`.
- Regenerate launcher icons after replacing `assets/` artwork: `bun run assets`.
- Handle the hardware back button with `@capacitor/app` if your UX needs it (not wired by default).

## Desktop (Electron via Capawesome)

- The desktop shell is provided by `@capawesome/capacitor-electron` and lives in `electron/`. It is wired as a **workspace member** of the generated app: one install, one lockfile. Never merge `electron/package.json` into the app root.
- Always use the **full platform name** in Capacitor commands:

```bash
bunx cap sync @capawesome/capacitor-electron
```

Bare `electron` silently resolves to the npm `electron` package and does nothing.

- Open the desktop window: `bun run desktop`. Live-reload loop with DevTools: `bun run desktop:dev` (Vite + Electron, no extra dependencies).
- Package installers/portables: `bun run build:desktop` (electron-builder).

## Web

- Production output is `dist/` with relative asset paths (`base: './'` in `vite.config.ts`) so the same bundle loads under plain hosting, the Capacitor WebView and the Electron protocol handler. Keep that setting.
- Behind HTTPS, the build is an installable PWA (manifest + auto-update service worker).

## Adding a platform later

Scaffolded web-only (or skipped a target)? Add it afterwards with [`ionic-everywhere add`](/cli/add) — it restores the pruned scripts and wires the workspace pointer for you.
