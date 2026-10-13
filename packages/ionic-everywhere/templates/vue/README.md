# __APP_NAME__

Ionic **Vue** app scaffolded with [@involvex/ionic-everywhere](https://github.com/involvex/ionic-everywhere)
(`-t with-vue`). One responsive codebase for Web, Android (Capacitor 8), and Desktop
(Electron via Capawesome).

## Scripts

| Command | What it does |
| --- | --- |
| `__APP_PM__ run dev` | Web dev server |
| `__APP_PM__ run build` | Type-check + production web build |
| `__APP_PM__ run sync` | Build once, sync Android + Electron |
| `__APP_PM__ run android` | Run on device/emulator |
| `__APP_PM__ run desktop` | Open the Electron window |
| `__APP_PM__ run desktop:dev` | Vite + Electron with hot reload |

## Layout / styling overlays

`--layout drawer|sidebar`, `--styling tailwind|shadcn|kumo`, and `--theme`
work on this Vue starter (`layout-*-vue` overlays plus shared style/theme
files). Feature overlays (`-t with-ai` / `with-localai`) stay React-only.
