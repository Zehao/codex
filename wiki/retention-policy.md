# 保留与删除边界

## 必须保留

这些目录属于 app-server 和完整 agent 能力闭包：

- `codex-rs/app-server`
- `codex-rs/app-server-protocol`
- `codex-rs/app-server-transport`
- `codex-rs/core`
- `codex-rs/protocol`
- `codex-rs/config`
- `codex-rs/login`
- `codex-rs/chatgpt`
- `codex-rs/model-provider*`
- `codex-rs/models-manager`
- `codex-rs/prompts`
- `codex-rs/exec-server`
- `codex-rs/apply-patch`
- `codex-rs/file-system`
- `codex-rs/file-search`
- `codex-rs/file-watcher`
- `codex-rs/git-utils`
- `codex-rs/codex-mcp`
- `codex-rs/rmcp-client`
- `codex-rs/ext/mcp`
- `codex-rs/core-skills`
- `codex-rs/skills`
- `codex-rs/hooks`
- `codex-rs/sandboxing`
- `codex-rs/linux-sandbox`
- `codex-rs/bwrap`
- `codex-rs/vendor/bubblewrap`
- `codex-rs/windows-sandbox-rs`
- `codex-rs/state`
- `codex-rs/rollout`
- `codex-rs/thread-store`

`codex-rs/windows-sandbox-rs` 作为 `codex-core` 的普通编译依赖保留。当前 fork 不把 Windows 作为目标运行平台，但 `core/src/exec.rs` 中部分 Windows policy helper 在 macOS/Linux 编译时也会被类型检查，因此不能直接删除该 crate。

## 第一轮已从 Rust workspace 删除

这些内容不属于 `codex-app-server` 的基础运行入口，已从 workspace 和文件树中删除：

- TUI/CLI/exec 产品入口：`codex-rs/cli`、`codex-rs/tui`、`codex-rs/exec`
- app-server 辅助客户端/daemon：`codex-rs/app-server-client`、`codex-rs/app-server-daemon`、`codex-rs/app-server-test-client`
- cloud 任务：`codex-rs/cloud-tasks*`
- 独立 MCP server 入口：`codex-rs/mcp-server`
- OSS provider 辅助入口：`codex-rs/lmstudio`、`codex-rs/ollama`
- 旧策略/实验/示例：`execpolicy-legacy`、`v8-poc`、`thread-manager-sample`、`responses-api-proxy`、`stdio-to-uds`
- TUI 或官方工程化专用 utils：`utils/approval-presets`、`utils/elapsed`、`utils/fuzzy-match`、`utils/oss`、`utils/readiness`、`utils/sandbox-summary`、`utils/sleep-inhibitor`
- npm/SDK/发布工程：`codex-cli`、`package.json`、`pnpm-lock.yaml`、`sdk`、`scripts`、`patches`、`third_party`、`bazel`、`tools`
- Bazel 构建文件：根目录 `.bazel*`、`BUILD.bazel`、`MODULE.bazel*`、`*.bzl`，以及 `codex-rs/**/BUILD.bazel`
- 上游工程化配置：Nix flake、prettier、codespell、markdownlint、npmrc、changelog、security policy、announcement tips、workspace launcher templates、`.codex`
- 本地编译产物：`codex-rs/target`

Bazel 是一套独立于 Cargo 的构建系统，原仓库用它服务官方 CI、跨平台 release、Windows 测试和部分第三方依赖构建。当前 fork 只保留 macOS/Linux 上的 Cargo + `codex-app-server` 路线，因此 Bazel 文件不再需要。

## 顶层目录说明

根目录 `docs`、`.github`、`.devcontainer`、`.vscode` 已删除。npm 发布、SDK、Bazel、third_party、release scripts、上游格式化配置、Nix 配置和本地构建产物也已删除。

当前根目录只保留：

- `.gitignore`
- `AGENTS.md`
- `codex-rs`
- `justfile`
- `LICENSE`
- `NOTICE`
- `README.md`
- `wiki`

## 后续裁剪顺序

1. 保持 `cargo check -p codex-app-server` 通过。
2. 从 `app-server/src/message_processor.rs` 的 request processor 开始删 API 面。
3. 先删官方产品化能力：remote control、marketplace、plugin share、feedback、external agent migration。
4. 再根据业务需要决定是否保留 image generation、web search、memories、goal、realtime。
5. 最后才考虑拆 `codex-core` 内部模块。
