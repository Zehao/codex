# Codex App-Server Fork

This repository is a lightweight app-server-only fork of Codex.

## Scope

- Target platforms are macOS and Linux only.
- The primary binary is `codex-app-server`.
- Do not restore the npm package, SDK publishing, TUI, CLI wrapper, Bazel, or upstream release CI unless explicitly requested.
- Keep `codex-windows-sandbox` as a `codex-core` compile dependency unless the Windows-specific call sites are explicitly refactored behind non-Windows stubs.
- Keep documentation in `wiki/`.

## Development

- Prefer existing Rust workspace patterns and local helper crates.
- Keep `codex-core` changes narrow; use existing extension points first.
- Preserve full agent runtime capability: MCP, skills, hooks, tool calls, sandboxing, approvals, rollout/state/thread storage.
- Use `cargo check -p codex-app-server` as the first build gate.
- Use `cargo test -p codex-app-server` for app-server changes and `cargo test -p codex-core` for runtime changes.

## Style

- Keep modules focused and avoid broad refactors during cleanup.
- Prefer explicit types and enums over ambiguous boolean or `Option` parameters when changing APIs.
- Keep public crate APIs small.
- Add concise comments only when the code is not self-explanatory.
