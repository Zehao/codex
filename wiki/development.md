# 开发与验证

## 系统要求

当前 fork 的基础要求是：

- macOS 12+，或 Ubuntu 20.04+/Debian 10+。
- Rust toolchain。
- Git。不是所有路径都强依赖 Git，但 agent 的工作区理解、diff、补丁和历史相关能力会用到它。
- 建议 8 GB RAM。

原文中的 npm、Homebrew、DotSlash、TUI 安装方式面向官方 Codex CLI 分发，当前 fork 不再作为主路径保留。Windows 支持、npm 发布、SDK 发布、Bazel 发布工程也已从主路径移除。

## 构建 app-server

根目录提供 `build.sh`，用于构建 `codex-app-server` 并把二进制复制到根目录 `bin/`：

```bash
./build.sh        # release
./build.sh debug  # debug
```

输出产物：

```bash
bin/codex-app-server
```

Cargo 原始产物仍在：

```bash
codex-rs/target/release/codex-app-server
codex-rs/target/debug/codex-app-server
```

`bin/` 是本地构建产物目录，已加入 `.gitignore`。

## 启动 app-server

构建后可以直接运行根目录产物：

```bash
./bin/codex-app-server --listen ws://127.0.0.1:48879
```

也可以从源码运行：

```bash
cd codex-rs
cargo run -p codex-app-server --bin codex-app-server -- --listen ws://127.0.0.1:4500
```

常见 transport：

- `--listen stdio://`：适合子进程方式嵌入。
- `--listen ws://127.0.0.1:4500`：适合本地客户端调试。
- `--listen unix://` 或 `unix:///path/to/socket`：适合同机 daemon-like 集成。

## 一键启动 Web 调试环境

根目录提供 `debug.sh`，用于同时启动 app-server 和 `frontend/` 中的 JSON-RPC Web 调试台：

```bash
./debug.sh
```

默认地址：

```bash
app-server: ws://127.0.0.1:48879
frontend:   http://127.0.0.1:5173
```

默认目录：

```bash
project cwd: ./debug-project
CODEX_HOME:  ./.debug-codex-home
```

`debug-project/` 是专用测试项目目录。app-server 会以该目录作为 cwd，前端 `thread/start` 默认也使用该目录，避免调试时默认读写仓库根目录。

`.debug-codex-home/` 是调试专用 Codex home，已整体加入 `.gitignore`，可以安全存放本地 `auth.json`、`config.toml`、session rollout 和 sqlite state。更多说明见 [web-debugger.md](web-debugger.md)。

## 根 justfile

根 `justfile` 已收缩为 app-server-only：

```bash
just app-server -- --listen ws://127.0.0.1:4500
just check
just build
just test
```

## 从源码构建

```bash
cd codex-rs
rustup component add rustfmt
rustup component add clippy
cargo build -p codex-app-server --bin codex-app-server
```

如果需要格式化或 lint，当前 fork 还没有恢复完整原上游 CI 工具链，优先用 crate 级命令：

```bash
cargo fmt
cargo clippy -p codex-app-server --all-targets
```

## 验证门禁

首选验证命令：

```bash
cd codex-rs
cargo check -p codex-app-server
```

如果改到协议或 processor：

```bash
cargo test -p codex-app-server
cargo test -p codex-app-server-protocol
```

如果改到 agent runtime：

```bash
cargo test -p codex-core
```

## 当前环境注意

本轮执行时 `cargo` 可用，路径为 `$HOME/.cargo/bin/cargo`。已尝试运行：

```bash
cd codex-rs
cargo check -p codex-app-server
```

该命令在同步 Rust toolchain、git dependencies 和 crates.io index 阶段长时间无新增输出，尚未进入 Rust 编译阶段；为避免后台任务悬挂，已手动停止。仓库 manifest 已做静态一致性检查：workspace member 和 workspace path dependency 均未指向不存在路径。

## 日志

Codex 是 Rust 项目，仍遵循 `RUST_LOG`：

```bash
RUST_LOG=info cargo run -p codex-app-server --bin codex-app-server -- --listen ws://127.0.0.1:4500
```

原 `docs/install.md` 中的 TUI 日志路径和 `codex exec` 日志说明已经不适用于当前主路径。

## 二开建议

- 客户端优先对接 `app-server-protocol`，不要重新解析 TUI/CLI 输出。
- 定制工具优先走 MCP 或 dynamic tools，减少直接改 `codex-core` 的成本。
- 定制提示词优先走 skills、AGENTS.md、developer instructions。
- 定制权限优先走 permission profile，不要绕过 sandbox/approval。
- 如果要删 API，先从 app-server processor 删除入口，再删除底层依赖。
