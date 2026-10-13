# `ionic-everywhere new`

Scaffold a new project.

```bash
bunx @involvex/ionic-everywhere new my-app
bunx create-ionic-everywhere my-app -t with-ai
ionic-everywhere new my-app --yes
ionic-everywhere new my-app --template blank --yes
ionic-everywhere new my-app --no-electron   # web + Android only
ionic-everywhere templates                  # list named templates
```

With a global install (`bun add -g @involvex/ionic-everywhere`), `create-ionic-everywhere [dir]` is an alias for `new`.

## Named templates (`-t` / `--template`)

Expo-style catalog (orthogonal to `--layout` / `--styling` / `--theme`):

| Id             | Aliases   | Description                                       |
| -------------- | --------- | ------------------------------------------------- |
| `tabs`         | `default` | Tabs + sidebar Ionic React starter (default)      |
| `blank`        | `minimal` | Minimal Ionic React starter                       |
| `with-vue`     | `vue`     | Tabs + sidebar Ionic Vue starter                  |
| `with-ai`      | `ai`      | Chat UI + OpenCode v2 / OpenAI-compatible backend |
| `with-localai` | `localai` | On-device LLM (llama.cpp) + WebLLM for browser    |

## Options

| Flag                                            | Meaning                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `--name <name>`                                 | Display name (no `& < > " ' \` or line breaks — they break Android's `strings.xml`) |
| `--app-id <id>`                                 | Reverse-DNS id, e.g. `com.example.myapp`                                            |
| `--pm <pm>`                                     | Package manager for the generated project: `bun`, `npm`, `pnpm`, `yarn`             |
| `-t, --template <id>`                           | Named template (see table above)                                                    |
| `--layout <tabs\|drawer\|sidebar>`              | Navigation layout (default: `tabs`)                                                 |
| `--styling <ionic-css\|tailwind\|shadcn\|kumo>` | Styling engine (default: `ionic-css`)                                               |
| `--theme <light-dark\|hacker\|monokai>`         | Color theme (default: `light-dark`)                                                 |
| `--no-android`                                  | Skip the Android platform                                                           |
| `--no-electron`                                 | Skip the desktop (Electron) platform                                                |
| `--no-install`                                  | Skip dependency install and platform generation                                     |
| `--no-git`                                      | Skip git init                                                                       |
| `--tests`                                       | Add a Vitest testing scaffold (interactive default: yes; `--yes` default: no)       |
| `--keep-on-failure`                             | Keep a partially created project when a step fails instead of offering to remove it |
| `--yes`                                         | Accept defaults, no prompts                                                         |

The scaffold writes a `.ionic-everywhere.json` manifest recording your options. Keep it in version control — [`upgrade`](/cli/upgrade) and [`list`](/cli/list) rely on it.
