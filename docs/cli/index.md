# CLI reference

`ionic-everywhere` (global install also provides `create-ionic-everywhere` and `ine` binaries) manages the full lifecycle of a generated project.

| Command                   | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| [`new`](/cli/new)         | Scaffold a new project                               |
| [`add`](/cli/add)         | Add `android` or `desktop` to an existing project    |
| [`upgrade`](/cli/upgrade) | Bring a project's tooling up to the current template |
| [`sign`](/cli/sign)       | Build and sign an Android release APK                |
| [`list`](/cli/list)       | Show generator info for the nearest project          |
| [`doctor`](/cli/doctor)   | Check the environment                                |
| `completions <shell>`     | Generate shell tab completions                       |

Global flags: `-h, --help` prints help, `-v, --version` prints the version.

Non-interactive use (CI, scripts): pass `--yes` to accept defaults. Without a TTY and without `--yes`, commands that need answers exit with an error listing the required flags.
