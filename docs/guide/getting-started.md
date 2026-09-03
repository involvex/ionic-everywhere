# Getting started

Scaffold a new project, run it on the web, then add native targets when you need them.

## Prerequisites

| Target  | Needs                                                    |
| ------- | -------------------------------------------------------- |
| Web     | Node ≥ 20 (or Bun ≥ 1.3)                                 |
| Desktop | Nothing extra (Electron downloads on first package)      |
| Android | JDK **21+** (`JAVA_HOME`) · Android SDK (`ANDROID_HOME`) |

::: warning
Capacitor 8 requires JDK 21 or newer for Android builds. Run `ionic-everywhere doctor` to check your environment before building an APK.
:::

## Scaffold

```bash
bunx @involvex/ionic-everywhere new my-app
cd my-app
```

Answer the prompts (app name, application id, package manager, platforms), or accept all defaults non-interactively:

```bash
bunx @involvex/ionic-everywhere new my-app --yes
```

Useful flags: see [`ionic-everywhere new`](/cli/new).

::: tip Repeat users
Prefer a global install? `bun add -g @involvex/ionic-everywhere`, then run `ionic-everywhere new my-app` — or the shorter `create-ionic-everywhere my-app` / `ine my-app`, which map to `new` automatically.
:::

## Run on the web

```bash
bun run dev    # hot-reload dev server
bun run build  # production build into dist/
```

## Sync and run natively

```bash
bun run sync     # build once, copy into Android + Electron shells
bun run android  # build + sync, then run on device/emulator
bun run desktop  # build + sync, then open the Electron window
```

The `android` and `desktop` commands auto-build and sync first via their `pre*` hooks — no manual sync step needed.

## Package for distribution

```bash
bun run build:android  # debug APK
bun run build:desktop  # installer/portable via electron-builder
bun run build:all      # both, in sequence
```

## Next steps

- [Generated app](/guide/generated-app) — scripts, layout, PWA, icons, adding pages
- [Platforms](/guide/platforms) — Android and desktop specifics
- [CLI reference](/cli/) — every command and flag
