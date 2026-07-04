# Codex Web Debugger

This frontend is a local debugging client for `codex-app-server`.

It connects to the app-server JSON-RPC WebSocket transport, starts threads and turns, displays conversation events, and provides raw RPC tooling for protocol debugging.

## Recommended Start

Use the repository root script:

```bash
../debug.sh
```

It starts both:

```bash
app-server: ws://127.0.0.1:48879
frontend:   http://127.0.0.1:5173
```

The app-server uses:

```bash
CODEX_HOME=../.debug-codex-home
cwd=../debug-project
```

`.debug-codex-home/` is ignored by Git because it may contain API keys, auth state, session rollouts, sqlite state, logs, and caches.

## Frontend-Only Development

If the app-server is already running:

```bash
VITE_CODEX_WS_TARGET=ws://127.0.0.1:48879 npm run dev
```

The page defaults to connecting through `/rpc`. Vite proxies `/rpc` to `VITE_CODEX_WS_TARGET` and removes the browser `Origin` header so local app-server WebSocket checks do not reject the request.

## Page Layout

- Connection Info: WebSocket URL, cwd, model override, sandbox, approval policy, initialize, and `thread/start`.
- Conversation / Logs: readable conversation stream, notifications, wire frames, and the selected frame payload.
- RPC Request: method presets, params JSON, and latest response.
- Server Request: reverse JSON-RPC requests from the server that require a client response.
