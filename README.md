# Codex App-Server Fork

这个仓库保留 Codex 的完整 agent runtime 能力，并把默认产品入口收缩为 `codex-app-server`。目标场景是：启动一个本地 app-server，由自定义客户端连接它，基于 JSON-RPC 协议驱动 agent、工具调用、MCP、skills、沙箱和会话管理。

当前 fork 只面向 macOS 和 Linux，不保留 npm 发布、SDK 发布、Bazel/CI 发布工程。`codex-windows-sandbox` 源码作为 `codex-core` 编译依赖保留，但不作为本 fork 的目标平台能力维护。

## 构建

根目录提供 `build.sh`，用于构建 `codex-app-server` 并把产物复制到根目录 `bin/`：

```bash
./build.sh        # release
./build.sh debug  # debug
```

产物位置：

```bash
bin/codex-app-server
```

Cargo 原始产物仍在：

```bash
codex-rs/target/release/codex-app-server
codex-rs/target/debug/codex-app-server
```

`bin/` 是本地构建产物目录，已加入 `.gitignore`。

## 快速启动 app-server

```bash
./bin/codex-app-server --listen ws://127.0.0.1:48879
```

也可以直接从源码运行：

```bash
cd codex-rs
cargo run -p codex-app-server --bin codex-app-server -- --listen ws://127.0.0.1:48879
```

## Web 调试台

根目录提供 `debug.sh`，用于同时启动后端 app-server 和 `frontend/` 中的 JSON-RPC Web 调试台：

```bash
./debug.sh
```

默认端口和目录：

```bash
app-server: ws://127.0.0.1:48879
frontend:   http://127.0.0.1:5173
project:    ./debug-project
CODEX_HOME: ./.debug-codex-home
```

> `.debug-codex-home` 可能包含 `auth.json`、`config.toml`、session rollout、sqlite state 和模型密钥相关信息，已整体加入 `.gitignore`。

模型 provider 配置放在：

```bash
.debug-codex-home/config.toml
```

建议把 API Key 放在环境变量，例如：

```bash
export CODEX_DEBUG_API_KEY=...
./debug.sh
```

## 当前保留能力

- app-server JSON-RPC
- thread/turn agent 会话
- 模型 provider 与认证
- shell/process/file-system 工具
- MCP client/tool/resource
- skills、hooks、插件基础设施
- sandbox、permission profile、approval
- rollout/thread-store/state 持久化

## 文档

完整知识库在 [wiki/](wiki/)：

- [架构说明](wiki/architecture.md)
- [保留与删除边界](wiki/retention-policy.md)
- [开发与验证](wiki/development.md)
- [App-Server API 关注面](wiki/app-server-api.md)
- [Web 调试台](wiki/web-debugger.md)
- [配置与认证](wiki/configuration.md)
