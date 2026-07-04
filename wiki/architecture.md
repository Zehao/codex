# App-Server 架构说明

## 当前定位

这个 fork 的核心目标是提供一个可二次开发的 Codex agent 服务端。客户端不再通过完整 `codex` CLI 进入，而是直接启动并连接 `codex-app-server`。

当前目标平台限定为 macOS 和 Linux。npm 分发、SDK 发布、Bazel/CI 发布工程已经从主路径移除。`codex-windows-sandbox` 源码仍作为 `codex-core` 编译依赖保留，因为部分 Windows policy helper 函数在非 Windows 编译中也会被类型检查。

```bash
cd codex-rs
cargo run -p codex-app-server --bin codex-app-server -- --listen ws://127.0.0.1:4500
```

## 核心模块

- `codex-rs/app-server`：服务端入口、transport、JSON-RPC 分发、request processor。
- `codex-rs/app-server-protocol`：客户端/服务端共享协议类型。
- `codex-rs/app-server-transport`：stdio、WebSocket、Unix socket 传输抽象。
- `codex-rs/core`：agent 业务核心，包括 session、turn、模型请求、工具调度、上下文、权限、沙箱、MCP、skills、hooks。
- `codex-rs/protocol`：core 内部事件、模型 item、权限和审批等共享类型。
- `codex-rs/exec-server`：进程、PTY、文件系统执行服务，是 app-server 命令执行能力的重要组成。
- `codex-rs/config`：配置、requirements、权限 profile、MCP 配置、skills/hooks/plugin 配置。
- `codex-rs/state`、`codex-rs/rollout`、`codex-rs/thread-store`：会话历史、元数据和本地状态持久化。

## 一次请求链路

1. 客户端连接 app-server，并发送 `initialize`。
2. 客户端调用 `thread/start` 或 `thread/resume` 创建/恢复 agent thread。
3. 客户端调用 `turn/start` 提交用户输入。
4. `app-server` 把请求交给 `ThreadManager` 和 `codex-core`。
5. `codex-core` 构建 turn context，加载 AGENTS.md、skills、plugins、hooks、MCP 工具和权限 profile。
6. 模型返回 assistant message 或工具调用。
7. 工具调用经 `ToolRouter` 分发到 shell、apply_patch、MCP、dynamic tools、skills 相关运行时等。
8. 工具输出回写模型上下文，直到 turn 完成。
9. app-server 通过 JSON-RPC notification 向客户端流式发送 item、turn、tool、diff、approval 等事件。

## 保留完整能力的原因

`codex-app-server` 依赖 `codex-core`，而 `codex-core` 是完整 agent runtime。MCP、skills、hooks、沙箱、权限审批、工具执行、上下文压缩和会话持久化都在这个闭包内。因此第一轮裁剪只删除外围产品入口和发布工程，不拆 runtime 内部模块。
