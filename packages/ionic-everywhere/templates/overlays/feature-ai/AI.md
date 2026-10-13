# AI chat (with-ai template)

This project was scaffolded with `-t with-ai`.

## Backends

1. **OpenCode (recommended)** — run a local agent and point the app at it:

   ```bash
   opencode serve --port 4096
   ```

   Default URL: `http://127.0.0.1:4096`. On Android emulators/devices, use your
   machine's LAN IP (and allow CORS / firewall) or a tunneled URL. Keys stay in
   OpenCode — do not put cloud provider secrets in the Capacitor WebView.

2. **OpenAI-compatible** — any `/v1/chat/completions` endpoint (OpenAI, Groq,
   local gateways, etc.). Configure base URL, model, and API key in **Settings**.

## Packages

- `@opencode/client` — typed OpenCode HTTP client (optional; the app falls back
  to raw `fetch` if the client API differs).

## Android note

`localhost` on a device is the phone itself. Use a LAN or remote OpenCode URL,
or switch Settings → Backend to **OpenAI-compatible** with a reachable endpoint.
