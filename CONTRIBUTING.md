# Contributing

Thanks for helping with `@involvex/ionic-everywhere` — a CLI that scaffolds one
responsive Ionic React codebase for Web + Android + Desktop.

## Ground rules

- **Bun only** (stable, ≥1.4.1 — canary builds are known to produce broken
  installs). No npm/pnpm/yarn commands locally.
- **PowerShell** syntax on Windows (`Remove-Item -Recurse`, not `rm -rf`).
- **Never run plain `bun add`** to change dependencies — it has rewritten
  `package.json` and dropped fields. Edit the manifest by hand, then `bun install`.
- A file watcher reformats on write: **always `Read` a file immediately before
  any `Edit`**.
- Full conventions and gotchas live in [AGENTS.md](AGENTS.md) — read it before
  touching the template or CLI source.

## Workflow for generated-app changes

Prototype in `reference-app/` first (it installs real deps and can be
built/synced against all three targets), then port the final source into
`packages/ionic-everywhere/templates/default/`, preserving the `__APP_*__`
tokens in `package.json`, `capacitor.config.ts`, and `index.html`.

Pinned rules (all enforced by unit tests — don't remove them):

- `typescript` stays `^5.9.3` (pure-JS; TS7's per-platform native binaries break
  under some bun versions).
- `react-router` / `react-router-dom` stay direct deps on v6
  (`@ionic/react-router` only peer-depends on them; bun won't auto-install peers).
- Platform scripts live in `src/platform-scripts.ts` (single source of truth);
  the drift-guard test fails if the template diverges from it.

## Before opening a PR

- [ ] `bun run verify` passes (format + lint:fix + test)
- [ ] `bun run build` passes
- [ ] If the template changed: scaffold into a temp dir
      (`bun packages/ionic-everywhere/dist/cli.js new <tmp> --yes --no-git`)
      and confirm the output builds
- [ ] Update `tests/scaffold.test.ts` expectations if template content changed
      materially

Keep PRs focused; one concern per PR. For bugs, use the bug-report issue
template; for ideas, the feature-request template. By contributing you agree
your work is licensed under the repo's [MIT License](LICENSE), and that you
follow the [Code of Conduct](CODE_OF_CONDUCT.md).
