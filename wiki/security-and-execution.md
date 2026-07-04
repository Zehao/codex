# 安全、沙箱与执行策略

## 沙箱与审批

app-server-only fork 仍保留完整安全执行链路：

- `codex-rs/sandboxing`
- `codex-rs/linux-sandbox`
- `codex-rs/bwrap`
- `codex-rs/vendor/bubblewrap`
- `codex-rs/execpolicy`
- `codex-rs/exec-server`
- permission profile
- approval policy

这意味着删除 CLI/TUI/exec 产品入口不会移除 agent 的命令执行安全边界。

## 执行策略

原 `docs/execpolicy.md` 是官方执行策略文档跳转页。当前 fork 中仍保留 `codex-rs/execpolicy`，因为工具调用和 shell/process 执行仍需要策略判断。

后续二次开发时，建议把策略分成三层：

1. 产品默认策略：由 app-server 启动配置或 managed config 固定。
2. 工作区策略：由项目配置、AGENTS.md、requirements 控制。
3. 单次工具调用策略：通过 approval request/response 决定是否放行。

## 非交互 exec

原 `docs/exec.md` 描述的是 `codex exec` 非交互产品入口。这个入口已经从当前 fork 删除。

需要注意：删除 `codex exec` 不等于删除执行能力。当前仍保留：

- app-server 的 `command/exec`
- app-server 的 `process/spawn`
- core 工具调用中的 shell/process runtime
- `codex-rs/exec-server`

客户端如果需要“一次性任务”语义，应通过 app-server 创建 thread/turn，而不是恢复 `codex exec`。

## 迁移判断

原始文档：

- `docs/sandbox.md`
- `docs/execpolicy.md`
- `docs/exec.md`

已整理到本文件。`exec.md` 的产品入口内容不再保留，但底层执行能力继续保留。
