---
layout: home
hero:
  actions:
    - link: /guide/getting-started
      text: Get started
      theme: brand
    - link: /cli/
      text: CLI reference
      theme: alt
  name: ionic-everywhere
  tagline: One responsive Ionic React codebase → Web + Android + Desktop apps.
features:
  - details: Ionic React 9 + Vite + TypeScript. Bottom tabs on phones, sidebar on wide screens — same routes everywhere.
    title: Single codebase
  - details: Capacitor 8 shells. Build once, sync into native projects, ship APKs and installers.
    title: Web + Android + Desktop
  - details: Manifest, auto-update service worker, icons and splash pipeline included out of the box.
    title: PWA ready
  - details: new, add, upgrade, list and doctor commands keep generated projects in sync with the template.
    title: Maintainable scaffolds
---

## Quick start

```bash
bunx @involvex/ionic-everywhere new my-app
cd my-app

bun run dev     # web dev server (hot reload)
bun run sync    # production build + sync native shells
bun run desktop # open the Electron window
```

New here? Start with the [getting started guide](/guide/getting-started).
