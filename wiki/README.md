# Codex App-Server Fork 知识库

这个仓库已经按 app-server-only 方向做第一轮收缩：默认启动面从 `codex app-server` 改为直接运行 `codex-app-server`，同时保留完整 agent 运行时能力，包括模型调用、工具调用、MCP、skills、hooks、沙箱、权限审批、会话持久化和 app-server JSON-RPC。

## 文档索引

- [architecture.md](architecture.md)：当前保留架构、核心模块和请求链路。
- [retention-policy.md](retention-policy.md)：保留/删除边界，以及第一轮清理结果。
- [development.md](development.md)：构建、启动、验证和二开建议。
- [app-server-api.md](app-server-api.md)：客户端连接 app-server 时优先关注的 API 面。
- [configuration.md](configuration.md)：配置、认证、requirements 和 managed hooks。
- [agent-customization.md](agent-customization.md)：AGENTS.md、skills、hooks 和客户端命令设计。
- [security-and-execution.md](security-and-execution.md)：sandbox、approval、exec policy 和执行能力边界。
- [codex-rs-docs/](codex-rs-docs/)：保留的 Rust 侧协议/MCP 文档。

## 当前原则

1. 以 `codex-app-server` 为唯一产品入口。
2. 不拆 `codex-core` 的 agent 能力闭包，先保证完整能力可用。
3. 优先通过 app-server protocol、MCP、skills、hooks、dynamic tools 做二次开发。
4. 后续裁剪按 API/processor 逐步缩小，不从底层 runtime 盲删。

## 根 docs 迁移状态

原仓库根 `docs/` 已重新理解并整理进本 wiki：

- `agents_md.md`、`skills.md`、`slash_commands.md` → [agent-customization.md](agent-customization.md)
- `authentication.md`、`config.md`、`example-config.md` → [configuration.md](configuration.md)
- `sandbox.md`、`execpolicy.md`、`exec.md` → [security-and-execution.md](security-and-execution.md)
- `install.md` → [development.md](development.md)
- `CLA.md`、`contributing.md`、`open-source-fund.md` 属于原上游项目治理内容，当前 fork 不再保留到主知识库。

原根目录 `docs/` 和临时镜像目录 `wiki/upstream-docs/` 已删除。
