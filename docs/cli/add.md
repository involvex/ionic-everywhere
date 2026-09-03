# `ionic-everywhere add`

Add a platform to an existing project.

```bash
cd my-app && ionic-everywhere add desktop
ionic-everywhere add android --dir ./my-app
```

## Usage

```
ionic-everywhere add <android|desktop> [--dir <path>] [--pm <pm>] [--no-install] [--yes]
```

- `electron` is accepted as an alias for `desktop`.
- Without `--dir`, the CLI walks up from the current directory to find the project root.
- `add` restores the pruned npm scripts for the platform from the canonical registry and, for desktop, injects the `electron` workspace pointer and reinstalls from the root so there is a single lockfile.
