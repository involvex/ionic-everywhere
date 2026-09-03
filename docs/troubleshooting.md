# Troubleshooting

## `error: invalid source release: 21`

Gradle ran on a JDK older than 21. Point `JAVA_HOME` at JDK 21+ and retry. Run `ionic-everywhere doctor` to confirm.

## `Unsupported class file major version 69`

The opposite direction: Gradle ran on a too-new JVM (class-file 69 = JDK 25, which the bundled Gradle 8.x cannot load). Switch `JAVA_HOME` to JDK 21. `doctor` warns when the detected JDK is ≥ 24.

## `Unable to resolve @typescript/typescript-win32-x64`

A stale install of the native TypeScript 7 preview. The scaffold ships pure-JS TypeScript 5.x, which has no platform binaries. Fix: delete `node_modules/` and your lockfile, then reinstall.

## `Cannot find package 'rolldown'`

A broken install layout from Bun 1.4.0-canary. Upgrade to stable Bun (≥ 1.4.1) and reinstall from scratch.

## `cap sync electron` does nothing

Use the full platform name:

```bash
bunx cap sync @capawesome/capacitor-electron
```

Bare `electron` resolves to the npm `electron` package and silently no-ops.

## Blank page after adding a route

- `IonReactRouter` / `IonReactHashRouter` come from `@ionic/react-router`, not `@ionic/react`.
- React Router 6 `<Route>` has no `exact` prop (matching is exact by default).
- Prefer registering the page in `src/nav.ts` so routes, tabs and menu stay in sync.

## Desktop window shows stale content

Run `bun run sync` (or the `desktop` command, which syncs first) so the production bundle is copied into `electron/app/`. For live reload during development, use `bun run desktop:dev`.

## `electron.exe` missing after install (bun)

Bun blocks lifecycle scripts by default, so Electron's binary never materializes. Fix inside the platform dir:

```bash
cd electron && bun node_modules/electron/install.js
```

npm users are unaffected (postinstall runs normally).
