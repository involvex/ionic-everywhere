# On-device AI (with-localai template)

Scaffolded with `-t with-localai`. Uses **llama.cpp** on Android/Electron and
**WebLLM** in the browser — not llama.rn (React Native only) and not LiteRT.

## Platforms

| Target | Runtime |
| --- | --- |
| Android | [`llama-cpp-capacitor`](https://www.npmjs.com/package/llama-cpp-capacitor) |
| Electron | `node-llama-cpp` via preload IPC (`window.localAi.chat`) |
| Web | [`@mlc-ai/web-llm`](https://www.npmjs.com/package/@mlc-ai/web-llm) (in-browser WASM/WebGPU) |

## Model files

**Android / Electron:** GGUF models are **not** bundled (multi‑GB). Download one
(e.g. from Hugging Face), copy it onto the device or desktop, then set
**Settings → Model path** to the absolute path.

**Web:** leave Model path empty to use the default WebLLM id
(`Llama-3.2-1B-Instruct-q4f16_1-MLC`), or paste another WebLLM model id from the
[MLC model list](https://mlc.ai/models/). First run downloads weights into the
browser cache (needs WebGPU).

## Android

1. `bun run sync` / `cap sync android`
2. Confirm `llama-cpp-capacitor` is registered (Capacitor auto-discovers plugins).
3. Put a `.gguf` on device storage and set the absolute path in Settings.
4. Run on a real device or emulator with enough RAM.

## Electron

After scaffold (with desktop enabled), the CLI injects:

| File | Role |
| --- | --- |
| `electron/localai-sidecar.mjs` | `node-llama-cpp` session + `chatOnce` |
| `electron/localai-preload.cjs` | `contextBridge` → `window.localAi.chat` |
| `electron/localai-ipc.mjs` | `ipcMain.handle('localai:chat')` + preload registration |

`main.ts` and/or `capacitor.electron.config.ts` `hooks.beforeReady` call
`registerLocalAiIpc()`. The electron workspace also gets a `node-llama-cpp`
dependency. After `cap add`, run install from the app root so the workspace
picks it up.

## Why not llama.rn / LiteRT?

- **llama.rn** targets React Native’s New Architecture — not Capacitor WebViews.
- **LiteRT** is a general on-device ML runtime, not a drop-in chat LLM stack for
  this scaffold.
