# App-Server API 关注面

## 最小客户端流程

1. 建立连接。
2. 发送 `initialize`。
3. 调用 `thread/start` 创建 thread。
4. 调用 `turn/start` 提交用户输入。
5. 订阅并处理 `turn/started`、`item/*`、`turn/completed`、approval request、tool request 等通知。
6. 需要继续对话时，在同一个 thread 上继续调用 `turn/start`。

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
