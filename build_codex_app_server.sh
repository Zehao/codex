#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROFILE="${1:-release}"

case "$PROFILE" in
  release)
    TARGET_PROFILE="release"
    ;;
  debug | --debug)
    TARGET_PROFILE="debug"
    ;;
  *)
    echo "usage: ./build.sh [release|debug]" >&2
    exit 2
    ;;
esac

echo "[build] building codex-app-server ($TARGET_PROFILE)"
(
  cd "$ROOT_DIR/codex-rs"
  if [[ "$TARGET_PROFILE" == "release" ]]; then
    cargo build -p codex-app-server --release
  else
    cargo build -p codex-app-server
  fi
)

mkdir -p "$ROOT_DIR/bin"
cp "$ROOT_DIR/codex-rs/target/$TARGET_PROFILE/codex-app-server" "$ROOT_DIR/bin/codex-app-server"
chmod +x "$ROOT_DIR/bin/codex-app-server"

echo "[build] artifact: $ROOT_DIR/bin/codex-app-server"
