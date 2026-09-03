# `ionic-everywhere sign`

Build a signed Android release APK for an existing project.

```bash
cd my-app && ionic-everywhere sign
ionic-everywhere sign --dir ./my-app --yes \
  --keystore ./release.jks --store-pass <pass> --key-alias release --key-pass <pass>
```

## Usage

```
ionic-everywhere sign [--dir <path>] [--pm <pm>] [--yes] [--no-install]
                      [--keystore <path>] [--store-pass <pass>]
                      [--key-alias <alias>] [--key-pass <pass>]
```

| Option                | Description                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `--dir <path>`        | Project directory (defaults to nearest project root, walking up).                         |
| `--pm <pm>`           | Package manager (`bun`, `npm`, `pnpm`, `yarn`).                                           |
| `--keystore <path>`   | Path to the release keystore (`.jks` / `.keystore`), absolute or relative to the project. |
| `--store-pass <pass>` | Keystore password.                                                                        |
| `--key-alias <alias>` | Private key alias inside the keystore.                                                    |
| `--key-pass <pass>`   | Private key password (defaults to `--store-pass`).                                        |
| `--yes`               | Non-interactive mode; all signing flags above become required.                            |
| `--no-install`        | Skip dependency install when `node_modules` is missing.                                   |

Without `--yes`, missing signing values are asked for interactively (passwords via masked prompts).

## What it does

1. Locates the project root (or uses `--dir`) and verifies `package.json` and `android/` exist.
2. Validates the keystore path (fails early if the file is missing).
3. Installs dependencies if `node_modules` is missing (skippable via `--no-install`).
4. Runs `build` and `cap sync android`.
5. Runs `gradlew assembleRelease` inside `android/`, injecting the signing configuration via `android.injected.signing.*` project properties — no `build.gradle` edits, no credentials written to disk.

The signed APK is written to `android/app/build/outputs/apk/release/app-release.apk`.

::: warning
Signing credentials are passed as Gradle project properties, which can appear in build logs. Prefer running `sign` locally or in a trusted CI environment.
:::
