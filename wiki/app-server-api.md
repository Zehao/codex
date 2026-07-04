# App-Server API 关注面

## 最小客户端流程

1. 建立连接。
2. 发送 `initialize`。
3. 调用 `thread/start` 创建 thread。
4. 调用 `turn/start` 提交用户输入。
5. 订阅并处理 `turn/started`、`item/*`、`turn/completed`、approval request、tool request 等通知。
6. 需要继续对话时，在同一个 thread 上继续调用 `turn/start`。

## 消息类型区分

客户端需要区分三类 JSON-RPC 消息：

- client request：客户端主动调用 app-server，例如 `initialize`、`thread/start`、`turn/start`、`config/read`。
- server notification：app-server 主动推送但不要求客户端响应，例如 `item/agentMessage/delta`、`turn/completed`、`thread/status/changed`。这是对话和日志展示的主要来源。
- server request：app-server 反向发起且需要客户端回复的 request，例如审批、用户输入、MCP elicitation。它不是常规对话输出通道，正常对话时通常为空。

`frontend/` 调试台按这个区分组织页面：对话和通知在中部主区域，任意 client request 在 `RPC 请求` 区，server request 降级到底部单独处理。

## 建议优先保留的 API

- `initialize`
- `thread/start`
- `thread/resume`
- `thread/read`
- `thread/list`
- `thread/unsubscribe`
- `turn/start`
- `turn/steer`
- `turn/interrupt`
- `fs/readFile`
- `fs/writeFile`
- `fs/readDirectory`
- `fs/getMetadata`
- `fs/watch`
- `fs/unwatch`
- `command/exec`
- `process/spawn`
- `model/list`
- `config/read`
- `permissionProfile/list`
- `skills/list`
- `skills/extraRoots/set`
- `hooks/list`
- `mcpServerStatus/list`
- `mcpServer/resource/read`
- `mcpServer/tool/call`
- `mcpServer/oauth/login`

## 后续可裁剪的 API

如果业务不需要，可以逐步裁掉：

- `remoteControl/*`
- `marketplace/*`
- `plugin/*`
- `app/list`
- `feedback/upload`
- `externalAgentConfig/*`
- `review/start`
- `thread/realtime/*`
- account token usage、credits nudge 等官方产品接口

## 客户端实现原则

- 把 app-server 当作 stateful agent runtime，而不是一次性命令执行器。
- 以 thread 为会话边界。
- 以 turn 为用户请求边界。
- 所有工具、审批、文件变化都通过通知流处理。
- 业务自定义能力优先注册为 MCP/dynamic tool，而不是在客户端拼接 shell 命令。
