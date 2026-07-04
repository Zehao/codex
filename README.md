# Codex App-Server Fork

这个仓库保留 Codex 的完整 agent runtime 能力，并把默认产品入口收缩为 `codex-app-server`。目标场景是：启动一个本地 app-server，由自定义客户端连接它，基于 JSON-RPC 协议驱动 agent、工具调用、MCP、skills、沙箱和会话管理。

当前 fork 只面向 macOS 和 Linux，不保留 npm 发布、SDK 发布、Bazel/CI 发布工程。`codex-windows-sandbox` 源码作为 `codex-core` 编译依赖保留，但不作为本 fork 的目标平台能力维护。

## 快速启动

```bash
cd codex-rs
cargo run -p codex-app-server --bin codex-app-server -- --listen ws://127.0.0.1:4500
```

也可以通过根目录 `justfile`：

```bash
just app-server -- --listen ws://127.0.0.1:4500
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
