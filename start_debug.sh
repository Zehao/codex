#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SERVER_PORT="${CODEX_APP_SERVER_PORT:-48879}"
APP_SERVER_WS="ws://127.0.0.1:${APP_SERVER_PORT}"
DEBUG_PROJECT_DIR="${DEBUG_PROJECT_DIR:-$ROOT_DIR/debug-project}"
DEBUG_CODEX_HOME="${DEBUG_CODEX_HOME:-$ROOT_DIR/.debug-codex-home}"
CONFIG_FILE="$DEBUG_CODEX_HOME/config.toml"
CONFIG_EXAMPLE="$DEBUG_CODEX_HOME/config.example.toml"

mkdir -p "$DEBUG_PROJECT_DIR" "$DEBUG_CODEX_HOME"

if [[ ! -x "$ROOT_DIR/bin/codex-app-server" ]]; then
  echo "[debug] bin/codex-app-server not found; running ./build.sh release"
  "$ROOT_DIR/build.sh" release
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  if [[ ! -f "$CONFIG_EXAMPLE" ]]; then
    cat > "$CONFIG_EXAMPLE" <<'EOF'
# Template for the debug app-server CODEX_HOME.
# debug.sh copies this file to config.toml on first run.
# Put secrets in environment variables where possible, not in this file.

model = "REPLACE_WITH_MODEL_ID"
model_provider = "debug-provider"

approval_policy = "on-request"
sandbox_mode = "workspace-write"

[model_providers.debug-provider]
name = "Debug Provider"
base_url = "https://REPLACE_WITH_PROVIDER_HOST/v1"
env_key = "CODEX_DEBUG_API_KEY"
wire_api = "responses"

# Optional examples:
# query_params = { api-version = "2025-04-01-preview" }
# http_headers = { "X-Static-Header" = "value" }
# env_http_headers = { "X-Provider-Token" = "CODEX_DEBUG_EXTRA_TOKEN" }
# experimental_bearer_token = "avoid-committing-real-secrets"

[projects."__DEBUG_PROJECT_DIR__"]
trust_level = "trusted"
EOF
  fi
  sed "s#__DEBUG_PROJECT_DIR__#$DEBUG_PROJECT_DIR#g" "$CONFIG_EXAMPLE" > "$CONFIG_FILE"
  echo "[debug] created $CONFIG_FILE"
  echo "[debug] fill model_provider/model/base_url/env_key before starting real turns"
fi

if [[ ! -d "$ROOT_DIR/frontend/node_modules" ]]; then
  echo "[debug] frontend/node_modules not found; running npm install"
  (cd "$ROOT_DIR/frontend" && npm install)
fi

echo "[debug] CODEX_HOME=$DEBUG_CODEX_HOME"
echo "[debug] project cwd=$DEBUG_PROJECT_DIR"
echo "[debug] app-server=$APP_SERVER_WS"
echo "[debug] frontend=http://127.0.0.1:5173"

(
  cd "$DEBUG_PROJECT_DIR"
  export CODEX_HOME="$DEBUG_CODEX_HOME"
  export RUST_LOG="${RUST_LOG:-info}"
  export CODEX_INTERNAL_APP_SERVER_REMOTE_CONTROL_DISABLED=1
  exec "$ROOT_DIR/bin/codex-app-server" --listen "$APP_SERVER_WS"
) &
BACKEND_PID=$!

(
  cd "$ROOT_DIR/frontend"
  export VITE_CODEX_WS_TARGET="$APP_SERVER_WS"
  export VITE_CODEX_DEFAULT_CWD="$DEBUG_PROJECT_DIR"
  exec npm run dev -- --host 0.0.0.0
) &
FRONTEND_PID=$!

terminate() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
}

trap terminate INT TERM EXIT

while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 1
done

echo "[debug] one process exited; stopping the other"
exit 1
