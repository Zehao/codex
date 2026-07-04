# 配置与认证

## 配置入口

Codex 的配置核心仍由 `codex-rs/config` 负责。app-server-only fork 不再保留完整 `codex` CLI 入口，但配置语义仍然服务于同一个 agent runtime：

- 模型 provider 与默认模型
- sandbox 与 approval policy
- MCP server 配置
- skills、hooks、plugin 配置
- managed config 与 `requirements.toml`
- 工作目录、日志、权限 profile

默认用户级配置路径由 `CODEX_HOME` 决定：

```bash
$CODEX_HOME/config.toml
```

本仓库的 `debug.sh` 会固定使用隐藏目录：

```bash
CODEX_HOME=./.debug-codex-home
```

因此本地 Web 调试时实际配置文件是：

```bash
.debug-codex-home/config.toml
```

`.debug-codex-home/` 已整体加入 `.gitignore`，不要把其中的 `auth.json`、`config.toml`、session rollout 或 sqlite state 提交到仓库。

## 模型 provider 调试配置

`debug.sh` 首次启动时会生成不含密钥的配置模板。最小配置示例：

```toml
model = "REPLACE_WITH_MODEL_ID"
model_provider = "debug-provider"

approval_policy = "on-request"
sandbox_mode = "workspace-write"

[model_providers.debug-provider]
name = "Debug Provider"
base_url = "https://REPLACE_WITH_PROVIDER_HOST/v1"
env_key = "CODEX_DEBUG_API_KEY"
wire_api = "responses"
```

推荐用环境变量提供密钥：

```bash
export CODEX_DEBUG_API_KEY=...
./debug.sh
```

如果 provider 需要额外 query/header，可以在同一段 provider 配置里补充：

```toml
query_params = { api-version = "2025-04-01-preview" }
http_headers = { "X-Static-Header" = "value" }
env_http_headers = { "X-Provider-Token" = "CODEX_DEBUG_EXTRA_TOKEN" }
```

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
