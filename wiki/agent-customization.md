# Agent 定制能力

## AGENTS.md

`AGENTS.md` 仍然是项目级指令的主要入口。app-server-only fork 删除的是外围 CLI/TUI 产品入口，不影响 `codex-core` 加载工作区上下文和项目指令。

原 `docs/agents_md.md` 中唯一的本地细节是：

- 启用 `child_agents_md` feature flag 后，Codex 会追加关于 AGENTS.md 作用域和优先级的说明。
- 即使没有 AGENTS.md，也会发出这段 user instructions message。

这说明 AGENTS.md 的层级和作用域是 runtime 行为，不属于 TUI 专属能力。

## Skills

skills 相关能力仍保留：

- `codex-rs/skills`
- `codex-rs/core-skills`
- `codex-rs/ext/skills`
- app-server 中的 skills processor

二次开发建议：

1. 稳定的业务方法论、工具使用规则、领域知识优先做成 skill。
2. 项目临时约束放到 AGENTS.md。
3. 客户端运行时临时指令通过 `turn/start` 输入或 thread 级上下文传递。

## Hooks

hooks 适合承载组织级控制逻辑，例如：

- 工具调用前审批/拦截
- 工具调用后审计
- session/turn 生命周期埋点
- 强制注入安全策略

如果需要强约束，结合 `requirements.toml` 的 `allow_managed_hooks_only = true` 使用。

## Slash Commands

原 `docs/slash_commands.md` 面向 Codex CLI/TUI 的 slash command 交互。当前 fork 不保留 TUI，因此 slash command 文档不再作为主知识入口。

如果未来客户端要实现类似能力，建议在客户端层解释命令，再转成 app-server 的 `thread/*`、`turn/*`、`fs/*`、`mcpServer/*` 请求，而不是恢复 TUI slash command。

## 迁移判断

原始文档：

- `docs/agents_md.md`
- `docs/skills.md`
- `docs/slash_commands.md`

已整理到本文件。`slash_commands.md` 的 CLI/TUI 专属内容不再保留。
