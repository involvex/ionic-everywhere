## Unreleased

### Added

- Expo-style named templates via `-t` / `--template`: `tabs`, `blank`,
  `with-vue`, `with-ai`, `with-localai` (aliases: `default`, `minimal`, `vue`,
  `ai`, `localai`).
- `ionic-everywhere templates` lists the catalog.
- Ionic Vue sibling template (`-t with-vue`): Vue 3.5 + `@ionic/vue` /
  `@ionic/vue-router`.
- `with-ai` overlay: Chat page, OpenCode HTTP / OpenAI-compatible backends,
  Settings fields, `.env.example`, `AI.md`.
- `with-localai` overlay: Local Chat page, `llama-cpp-capacitor` (Android),
  Electron preload IPC (`window.localAi.chat` + `node-llama-cpp`), WebLLM
  (`@mlc-ai/web-llm`) for browser, `LOCALAI.md`.
- Vue `--layout drawer|sidebar` and `--styling` overlays; Vue `--tests` uses
  `@vue/test-utils` instead of Testing Library.
- CI `localai-smoke`: tiny GGUF via `node-llama-cpp`; WebGPU/WebLLM skips on
  runners without a GPU.

### Changed

- Safe dependency bumps (Capacitor 8.5.3, Ionic React 9.0.7, React 19.3,
  Vite 8.3.4, `@capawesome/capacitor-electron` 0.2.2, tooling patch/minors).
  Held: TypeScript 7, Vitest 5, `vite-plugin-pwa` 2, React Router 8,
  Electron 44.

## [0.1.6] - 2026-09-15

- Patch release with publishing pipeline improvements.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2026-09-09

### Changed

- Version bumped to `0.1.5` because `0.1.4` was already published to npm.

## [0.1.4] - 2026-09-09

### Changed

- Publish script now uses `npm pack --dry-run` for validation instead of
  `bun publish --dry-run` (bun canary dry-run was observed to publish).
- Version bumped to `0.1.4` after `0.1.3` was published to npm.

## [0.1.3] - 2026-09-09

### Added

- Package-scoped README.md with badges, quickstart and CLI docs.
- Changelog generation for release pipeline.
- LICENSE and CHANGELOG.md included in npm package files.

### Changed

- Publish script gains version bump gate, changelog step, dry-run validation,
  annotated tag and push.
- `packages/ionic-everywhere/package.json` `files` array uses package-relative
  paths; version bumped to `0.1.3` to resolve registry conflict.

### Fixed

- `You cannot publish over the previously published versions: 0.1.2` error
  resolved by bumping version and adding pre-flight registry check.
