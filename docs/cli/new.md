# `ionic-everywhere new`

Scaffold a new project.

```bash
bunx @involvex/ionic-everywhere new my-app
ionic-everywhere new my-app --yes
ionic-everywhere new my-app --no-electron   # web + Android only
```

With a global install (`bun add -g @involvex/ionic-everywhere`), `create-ionic-everywhere [dir]` is an alias for `new`.

## Options

| Flag                | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `--name <name>`     | Display name (no `& < > " ' \` or line breaks — they break Android's `strings.xml`) |
| `--app-id <id>`     | Reverse-DNS id, e.g. `com.example.myapp`                                            |
| `--pm <pm>`         | Package manager for the generated project: `bun`, `npm`, `pnpm`, `yarn`             |
| `--no-android`      | Skip the Android platform                                                           |
| `--no-electron`     | Skip the desktop (Electron) platform                                                |
| `--no-install`      | Skip dependency install and platform generation                                     |
| `--no-git`          | Skip git init                                                                       |
| `--tests`           | Add a Vitest testing scaffold (interactive default: yes; `--yes` default: no)       |
| `--keep-on-failure` | Keep a partially created project when a step fails instead of offering to remove it |
| `--yes`             | Accept defaults, no prompts                                                         |

The scaffold writes a `.ionic-everywhere.json` manifest recording your options. Keep it in version control — [`upgrade`](/cli/upgrade) and [`list`](/cli/list) rely on it.
