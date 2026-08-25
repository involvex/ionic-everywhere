# **APP_NAME**

Cross-platform app scaffolded with [@involvex/ionic-everywhere](https://github.com/involvex/ionic-everywhere).
One responsive Ionic React codebase building **Web**, **Android** and **Desktop**.

## Scripts

| Command                   | What it does                                         |
| ------------------------- | ---------------------------------------------------- |
| `dev`                     | Web dev server (hot reload)                          |
| `build`                   | Type-check + production web build to `dist/`         |
| `typecheck`               | TypeScript check only (`tsc --noEmit`)               |
| `lint` / `lint:fix`       | ESLint                                               |
| `format` / `format:check` | Prettier                                             |
| `android`                 | Build + sync, then run on device/emulator            |
| `desktop`                 | Build + sync, then open the Electron window          |
| `open:android`            | Open the Android project in Android Studio           |
| `build:android`           | Debug APK (`android/app/build/outputs/apk/debug/`)   |
| `build:desktop`           | Package installer/portable per OS (electron-builder) |
| `build:all`               | Android + desktop in sequence                        |

The `android` / `desktop` commands run their `pre*` hooks first, which build the web
bundle and sync it into the native shell automatically — no manual sync needed.

## Layout

Responsive by design: bottom tab bar on narrow screens, persistent sidebar on wide screens
(`IonSplitPane`, breakpoint `lg`). Menu entries and tabs navigate the same routes.

## Requirements for native builds

- Android: JDK 21+, Android SDK (`ANDROID_HOME`)
- Desktop: nothing extra (Electron downloads on first package)

## Adding pages

1. Create `src/pages/MyPage.tsx` wrapping content in `<IonPage>`.
2. Add a `<Route path="/mypage">` in `src/App.tsx`.
3. Add an entry to `menuItems` in `src/components/AppMenu.tsx` and an `IonTabButton` in `App.tsx`.
