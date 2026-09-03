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
bunx @involvex/ionic-everywhere new my-app
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

| Command           | What it does                                          |
| ----------------- | ----------------------------------------------------- |
| `dev`             | Web dev server                                        |
| `build`           | Type-check + production web build (`dist/`)           |
| `typecheck`       | TypeScript check only                                 |
| `lint` / `format` | ESLint / Prettier quality gates                       |
| `sync`            | Build once, copy into Android + Electron shells       |
| `android`         | Build + sync, then run on device/emulator             |
| `desktop`         | Build + sync, then open the Electron window           |
| `open:android`    | Open Android project in Android Studio                |
| `build:desktop`   | Package desktop installer/portable (electron-builder) |
| `build:android`   | Sync + assemble debug APK                             |
| `build:all`       | Android + desktop in sequence                         |

Scripts are generated for your chosen package manager (`--pm bun|npm|pnpm|yarn`) —
with bun, internal chains use `bun run`, not `npm run`. The `android` and `desktop`
commands auto-build + sync first via their `pre*` hooks.

The Electron shell is wired as a **workspace member** of the generated app: one
`install`, one lockfile, no separate setup inside `electron/` — while leaving the
Capawesome-generated platform files untouched.

## Requirements

| Target  | Needs                                                    |
| ------- | -------------------------------------------------------- |
| Web     | Node ≥ 20 (or Bun ≥ 1.3)                                 |
| Desktop | Nothing extra (Electron downloads on first package)      |
| Android | JDK **21+** (`JAVA_HOME`) · Android SDK (`ANDROID_HOME`) |

## Stack

| Layer      | Tech                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| UI         | [Ionic React 9](https://ionicframework.com/docs/react) · React 19 · Vite 8 · TypeScript                 |
| Navigation | Adaptive `IonSplitPane` ⇄ `IonTabs`, React Router 6 via `@ionic/react-router`                           |
| Mobile     | [Capacitor 8](https://capacitorjs.com)                                                                  |
| Desktop    | Electron 43 via [@capawesome/capacitor-electron](https://github.com/capawesome-team/capacitor-electron) |

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
- [x] Live-reload desktop dev (`desktop:dev` - vite + Electron, DevTools auto-open)
- [x] Icon/splash generation in scaffold (`assets` script + placeholders)
- [x] PWA out of the box (web manifest + auto-update service worker)
- [x] `ionic-everywhere add <android|desktop>` for existing projects
- [x] Working settings persistence (preferences + dark mode) in the template
- [x] Opt-in Vitest testing scaffold (`--tests`)
- [ ] Optional templates: drawer-only, tabs-only
- [x] GitHub Actions CI (verify/build/scaffold smoke) + manual artifacts build

## License

MIT
