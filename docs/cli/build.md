# `ionic-everywhere build`

Run project build scripts across platforms.

```bash
cd my-app && ionic-everywhere build
ionic-everywhere build --platform android --dir ./my-app
ionic-everywhere build -p desktop
```

## Usage

```
ionic-everywhere build [--platform <all|android|desktop|web>] [-p <target>] [--dir <path>] [--pm <pm>]
```

| Option                 | Description                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `--platform, -p <tgt>` | Target platform to build (`all`, `android`, `desktop`/`electron`, `web`). Defaults to `all`. |
| `--dir <path>`         | Project directory (defaults to nearest project root, walking up).                            |
| `--pm <pm>`            | Package manager (`bun`, `npm`, `pnpm`, `yarn`).                                              |

## What it does

1. Locates the project root (or uses `--dir`) and verifies `package.json` exists.
2. Selects the appropriate build script based on the chosen platform:
   - `all` (default): runs `build:all` (falling back to `build`).
   - `android`: runs `build:android` (falling back to `build`).
   - `desktop`: runs `build:desktop` (falling back to `build`).
   - `web`: runs `build`.
3. Streams output using the project's selected package manager runner (`bun run`, `npm run`, etc.).
