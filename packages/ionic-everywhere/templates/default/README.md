# __APP_NAME__

Cross-platform app scaffolded with [@involvex/ionic-everywhere](https://github.com/involvex/ionic-everywhere).
One responsive Ionic React codebase building **Web**, **Android** and **Desktop**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Web dev server (hot reload) |
| `npm run build` | Type-check + production web build to `dist/` |
| `npm run sync` | Build + copy `dist/` into Android and Electron shells |
| `npm run dev:desktop` | Build once, open the Electron window |
| `npm run build:desktop` | Package installer/portable per OS (electron-builder) |
| `npm run build:android` | Debug APK (`android/app/build/outputs/apk/debug/`) |
| `npm run open:android` | Open the Android project in Android Studio |

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
