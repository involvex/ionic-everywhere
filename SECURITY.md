# Security Policy

## Supported versions

Only the latest `main` and the most recent npm release of
`@involvex/ionic-everywhere` receive security fixes:

| Version        | Supported          |
| -------------- | ------------------ |
| latest release | :white_check_mark: |
| older releases | :x:                |

Generated apps are standard Vite + Capacitor + Electron projects: after
scaffolding, you own the dependency tree. Keep it patched with your package
manager's audit tooling (`bun pm audit`, `npm audit`) — especially Electron,
which ships a full Chromium.

## Reporting a vulnerability

**Do not open a public issue.** Report privately via
[GitHub Security Advisories](https://github.com/involvex/ionic-everywhere/security/advisories/new)
(click **Report a vulnerability**).

Include:

- affected version / commit
- reproduction steps or proof of concept
- impact assessment, if known

Expect an acknowledgement within 7 days. We will coordinate a fix and credit
you in the release notes unless you prefer to stay anonymous.

## Scope notes

- The template pins pure-JS `typescript@5` deliberately; do not propose native-binary
  toolchain upgrades as security fixes without reading `reference-app/NOTES.md` first.
- `reference-app/android/` and `reference-app/electron/` are local regeneration
  artifacts (git-ignored) — reports against them should target the template or CLI
  source that produces them instead.
