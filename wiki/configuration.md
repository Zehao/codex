# 配置与认证

## 配置入口

Codex 的配置核心仍由 `codex-rs/config` 负责。app-server-only fork 不再保留完整 `codex` CLI 入口，但配置语义仍然服务于同一个 agent runtime：

- 模型 provider 与默认模型
- sandbox 与 approval policy
- MCP server 配置
- skills、hooks、plugin 配置
- managed config 与 `requirements.toml`
- 工作目录、日志、权限 profile

## 认证

认证相关模块仍保留：

- `codex-rs/login`
- `codex-rs/chatgpt`
- `codex-rs/keyring-store`
- `codex-rs/secrets`

客户端接入 app-server 时，不应该自己绕过认证层去拼接模型请求。推荐做法是让 app-server 使用既有 Codex auth/config 读取逻辑，再由客户端通过 app-server protocol 创建 thread 和 turn。

## requirements.toml

原根目录 `docs/config.md` 提到一个仍然重要的配置：

```toml
allow_managed_hooks_only = true
```

该配置只支持放在 `requirements.toml`，含义是忽略用户、项目、session 层 hook 配置，只允许 managed requirements/config 中的 hooks 生效。对二次开发很有用：可以把组织级安全/审计 hook 固定下来，避免被项目本地配置覆盖。

## 迁移判断

原始文档：

- `docs/authentication.md`
- `docs/config.md`
- `docs/example-config.md`

这些文件本身只是跳转官方文档。当前 fork 不再保留这些跳转页，知识入口统一放在本文件和后续更具体的配置文档中。
