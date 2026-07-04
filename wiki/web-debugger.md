# Web 调试台

`frontend/` 是一个用于调试 `codex-app-server` 的简易 Web 客户端。它通过 JSON-RPC over WebSocket 连接 app-server，用于验证基础对话、通知流、wire frame、任意 RPC 请求和服务端反向请求。

## 一键启动

根目录提供 `debug.sh`：

```bash
./debug.sh
```

它会同时启动：

```bash
app-server: ws://127.0.0.1:48879
frontend:   http://127.0.0.1:5173
```

启动时使用的默认目录：

```bash
project cwd: ./debug-project
CODEX_HOME:  ./.debug-codex-home
```

`debug-project/` 是专门给 agent 调试使用的项目目录，避免默认在仓库根目录里执行 shell、读写文件或生成上下文。

## 本地配置与密钥

调试用 Codex home 固定为隐藏目录：

```bash
.debug-codex-home/
```

这个目录已整体加入 `.gitignore`，因为它可能包含：

- `auth.json`
- `config.toml`
- session rollout
- sqlite state
- skills/plugin 缓存
- 本地日志和临时文件

模型 provider 配置写在：

```bash
.debug-codex-home/config.toml
```

`debug.sh` 首次启动时，如果配置文件不存在，会生成一个不含密钥的模板。推荐用 `env_key` 引用环境变量，不要把真实 API Key 写进可提交文件：

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

启动前设置环境变量：

```bash
export CODEX_DEBUG_API_KEY=...
./debug.sh
```

如果需要切换端口或目录，可以覆盖环境变量：

```bash
CODEX_APP_SERVER_PORT=48900 ./debug.sh
DEBUG_PROJECT_DIR=/tmp/codex-debug-project ./debug.sh
DEBUG_CODEX_HOME=/tmp/codex-debug-home ./debug.sh
```

## 页面模块

Web 调试台按纵向大模块组织：

1. `连接信息`：配置 WebSocket URL、cwd、model、approval policy、sandbox，并执行 `initialize` 和 `thread/start`。
2. `对话 / 对话日志`：左侧显示用户消息、assistant delta、turn 状态；右侧显示 notification、wire frame 列表和选中帧完整 payload。
3. `RPC 请求`：通过 method 下拉列表直接发送 JSON-RPC request，并查看最近一次 RPC 返回。
4. `Server 请求`：展示服务端反向发起、需要前端回复的 JSON-RPC request，例如审批、用户输入、MCP elicitation。正常对话时通常为空。

## WebSocket 代理

浏览器直接连 app-server 时会带 `Origin`，本地 app-server 对此较严格。前端开发服务器通过 Vite 代理 `/rpc` 到 app-server，并剥掉浏览器 `Origin` 头：

```bash
VITE_CODEX_WS_TARGET=ws://127.0.0.1:48879 npm run dev
```

`debug.sh` 会自动设置该变量。页面默认 WebSocket URL 使用 `/rpc`，因此普通调试不需要手动处理 Origin。

## 基础调试流程

1. `./build.sh` 构建 app-server。
2. 填写 `.debug-codex-home/config.toml`，并通过环境变量提供 API Key。
3. `./debug.sh` 启动后端和前端。
4. 打开 `http://127.0.0.1:5173`。
5. 点击 `连接并初始化`。
6. 点击 `thread/start`。
7. 在对话输入框发送 `turn/start`。
8. 通过对话日志、通知、wire frame 和 RPC Inspector 定位协议或 runtime 问题。
