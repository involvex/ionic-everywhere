---
name: ionic-everywhere
description: Scaffold one responsive Ionic React codebase that builds Web + Android (Capacitor 8) + Desktop (@capawesome/capacitor-electron). Covers project creation, environment checks, building, platform management, plugins, and agent skills setup.
metadata:
  author: involvex
  source: https://github.com/involvex/ionic-everywhere
---

# ionic-everywhere

`@involvex/ionic-everywhere` — a CLI that scaffolds **one responsive Ionic React codebase** that builds to **Web + Android (Capacitor 8) + Desktop (@capawesome/capacitor-electron)**.

Binaries: `ionic-everywhere` and `create-ionic-everywhere` (same entry point).

## Prerequisites

- **Node.js >= 20**
- **bun** (preferred) or **npm**
- **JDK 21+** (for Android builds)
- **Android SDK** (for Android builds)

## Creating a New Project

```bash
# Interactive scaffold
ionic-everywhere new my-app

# With defaults (no prompts)
ionic-everywhere new my-app --yes

# Web + Android only
ionic-everywhere new my-app --yes --no-electron

# Web + Desktop only
ionic-everywhere new my-app --yes --no-android

# With specific options
ionic-everywhere new my-app --name "My App" --app-id com.example.myapp --pm bun --layout drawer --styling tailwind --theme hacker

# Skip dependency install and platform setup
ionic-everywhere new my-app --yes --no-install
```

### Options

| Flag                                            | Description                                     |
| ----------------------------------------------- | ----------------------------------------------- |
| `--name <name>`                                 | Display name of the app                         |
| `--app-id <id>`                                 | Reverse-DNS application ID                      |
| `--pm <bun\|npm\|pnpm\|yarn>`                   | Package manager                                 |
| `--layout <tabs\|drawer\|sidebar>`              | Navigation layout                               |
| `--styling <ionic-css\|tailwind\|shadcn\|kumo>` | Styling engine                                  |
| `--theme <light-dark\|hacker\|monokai>`         | Color theme                                     |
| `--no-android`                                  | Skip Android platform                           |
| `--no-electron`                                 | Skip Desktop (Electron) platform                |
| `--no-install`                                  | Skip dependency install and platform generation |
| `--no-git`                                      | Skip git init                                   |
| `--tests`                                       | Add Vitest testing scaffold                     |
| `--yes`                                         | Accept defaults, no prompts                     |
| `--keep-on-failure`                             | Keep partial project on failure                 |

## Environment Checks

```bash
ionic-everywhere doctor
```

Checks Node.js, package manager, bun stability, git, JDK, and Android SDK.

## Building and Running

```bash
# Web dev server
npm run dev

# Production web build
npm run build

# Build once + sync both shells
npm run sync

# Android (auto build+sync)
npm run android

# Android debug APK
npm run build:android

# Desktop app (auto build+sync)
npm run desktop

# Desktop dev (vite + electron, hot reload + DevTools)
npm run desktop:dev

# Desktop installer/portable
npm run build:desktop
```

## Adding Platforms

```bash
# Add Android to existing project
ionic-everywhere add android

# Add Desktop (Electron) to existing project
ionic-everywhere add desktop
```

## Installing Plugins

```bash
npm install @capacitor/camera
npx cap sync
```

## Template Tokens

The template uses `__APP_NAME__`, `__APP_ID__`, and `__APP_NAME_KEBAB__` tokens that are replaced during scaffolding.

## Troubleshooting

- **`npx cap sync` fails**: Verify `@capacitor/core` and `@capacitor/cli` versions match. Run `cd android && ./gradlew clean`.
- **Build fails after config changes**: Clean with `cd android && ./gradlew clean`, then rebuild.
- **Plugin not found at runtime**: Run `npx cap sync` after plugin installation.
- **JDK errors**: Ensure JDK 21+ is installed and `JAVA_HOME` is set.
- **Android SDK not found**: Set `ANDROID_HOME` to your Android SDK path.

## Agent Skills Setup

After scaffolding a new project with `ionic-everywhere new`, you will be prompted to set up `.agents/skills/` for AI agent skills. This creates a `.agents/skills/` directory in your project where you can install skills for AI coding agents.

To manually install the ionic-everywhere skill:

```bash
npx skills add https://github.com/involvex/ionic-everywhere.git
```

This installs the skill to `.agents/skills/ionic-everywhere/` and creates symlinks for detected agents (Claude Code, Cursor, OpenCode, etc.).

## Repository Structure

```
packages/ionic-everywhere/   The CLI (TypeScript -> dist/, bins in package.json)
  src/                       cli.ts (entry/dispatch), new.ts (scaffold flow),
                             scaffold.ts (copy+tokens), doctor.ts (env checks)
  templates/default/         The generated app template
reference-app/               Hand-verified playground app
tests/                       Vitest unit tests
```

## Commands Reference

| Command                                   | Description                |
| ----------------------------------------- | -------------------------- |
| `ionic-everywhere new [dir]`              | Scaffold a new project     |
| `ionic-everywhere add <android\|desktop>` | Add a platform             |
| `ionic-everywhere doctor`                 | Check the environment      |
| `ionic-everywhere list`                   | Show generator info        |
| `ionic-everywhere upgrade`                | Bring tooling up to date   |
| `ionic-everywhere build`                  | Run project build scripts  |
| `ionic-everywhere sign`                   | Build and sign Android APK |
| `ionic-everywhere completions <shell>`    | Generate shell completions |

## Related Skills

- [capacitor-expert](https://github.com/capawesome-team/skills) — Comprehensive Capacitor reference
- [capacitor-app-creation](https://github.com/capawesome-team/skills) — Create a new Capacitor app
- [capacitor-app-development](https://github.com/capawesome-team/skills) — General Capacitor development
- [capawesome-cli](https://github.com/capawesome-team/skills) — Capawesome CLI reference
- [capawesome-cloud](https://github.com/capawesome-team/skills) — Live updates, native builds, app store publishing
