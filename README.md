# @involvex/ionic-everywhere

**One responsive Ionic React codebase → Web + Android + Desktop apps.**

A CLI that scaffolds a single TypeScript project using Ionic React 9, Capacitor 8 and
Electron — write your UI once, ship it to the browser, Google Play and Windows/macOS/Linux
from the same source tree.

```
                 ┌────────────── one Vite/Ionic-React codebase ──────────────┐
                 │                                                           │
                 ▼                              ▼                            ▼
             dist/  ──►  Web (static host / PWA)     Android (Capacitor)     Desktop (Electron)
                                              cap sync android        cap sync @capawesome/
                                              → Gradle → APK/AAB      capacitor-electron
                                                                      → .exe/.dmg/AppImage
```

## Quick start

> Not yet published to npm — clone this repo and use the local CLI (see Development).

```bash
# once published:
bunx create-ionic-everywhere my-app
cd my-app

bun run dev            # web dev server (hot reload)
bun run sync           # production build + sync both native shells
bun run build:desktop  # Windows / macOS / Linux app
bun run build:android  # debug APK
```

The generated app is **adaptive by design**: a bottom tab bar on narrow screens becomes a
persistent sidebar on wide screens (`IonSplitPane`, breakpoint `lg`). Menu entries and tabs
navigate identical routes, so the same navigation model feels native everywhere.

## Generated project scripts

| Command | What it does |
|---|---|
| `dev` | Web dev server |
| `build` | Type-check + production web build (`dist/`) |
| `sync` | Build once, copy into Android + Electron shells |
| `run:android` | Run on device/emulator via Capacitor |
| `open:android` | Open Android project in Android Studio |
| `dev:desktop` | Build web + electron main process, open window |
| `build:desktop` | Package desktop installer/portable (electron-builder) |
| `build:android` | Sync + assemble debug APK |
| `build:all` | Android + desktop in sequence |

## Requirements

| Target | Needs |
|---|---|
| Web | Node ≥ 20 (or Bun ≥ 1.3) |
| Desktop | Nothing extra (Electron downloads on first package) |
| Android | JDK **21+** (`JAVA_HOME`) · Android SDK (`ANDROID_HOME`) |

## Stack

| Layer | Tech |
|---|---|
| UI | [Ionic React 9](https://ionicframework.com/docs/react) · React 19 · Vite 8 · TypeScript |
| Navigation | Adaptive `IonSplitPane` ⇄ `IonTabs`, React Router 6 via `@ionic/react-router` |
| Mobile | [Capacitor 8](https://capacitorjs.com) |
| Desktop | Electron 43 via [@capawesome/capacitor-electron](https://github.com/capawesome-team/capacitor-electron) |

## Why this stack?

- **True single codebase** — unlike Expo/RN-Web setups there is no second rendering path;
  every target consumes the exact same `dist/` output.
- **Mature mobile story** — Capacitor's plugin ecosystem covers camera, storage, push, etc.
- **Actively maintained desktop bridge** — `@capawesome/capacitor-electron` (Jul 2026,
  MIT) replaces the abandoned `@capacitor-community/electron` with the familiar
  `cap add / sync / run` workflow.
- Alternatives considered: Tauri 2 (great binaries, rougher mobile), Expo universal
  (weaker desktop). Details in the research notes that seeded this project.

## Development (this monorepo)

```bash
bun install
bun run verify         # lint + tests
bun run build          # compile the CLI
bun packages/ionic-everywhere/dist/cli.js new D:/tmp/playground --yes
```

```
packages/ionic-everywhere/    CLI source + templates/default (the scaffolded app)
reference-app/                Hand-verified playground; see its NOTES.md for findings
tests/                        Unit tests
```

See [AGENTS.md](AGENTS.md) for contribution conventions and known pitfalls.

## Roadmap

- [ ] Publish `@involvex/ionic-everywhere` (+ create-* shim) to npm
- [ ] Live-reload desktop dev (`vite` + Capacitor serveMode)
- [ ] Icon/splash generation in scaffold
- [ ] Optional templates: drawer-only, tabs-only
- [ ] GitHub Actions matrix building all targets

## License

MIT
