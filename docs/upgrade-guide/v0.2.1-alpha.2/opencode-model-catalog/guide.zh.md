---
kind: upgrade-guide
description: "OpenCode 目录同步移除了停用的模型 ID，并为 Console 与 Go 模型提供各自协议的端点。"
---

# OpenCode 模型目录

[English](guide.md) | 中文

## 变更

内置 `opencode` 与 `opencode-go` 目录遵循 OpenCode 公布的模型列表。已保存的 `models` 列表、`modelOverrides` 键和所选模型 ID 若引用已停用的条目，需要改用可用模型。每个当前模型都自带协议与端点。

| 提供商 | 停用的模型 ID | 替代选择 |
|---|---|---|
| `opencode` | `fledge-alpha-free` | 选择当前免费模型，例如 `deepseek-v4.1-flash-free` |
| `opencode` | `ling-3.0-flash-fin-free` | 选择当前免费模型，例如 `mimo-v2.6-flash-free` |
| `opencode` | `ling-3.1-flash-free` | 选择当前免费模型，例如 `mimo-v2.6-flash-free` |
| `opencode-go` | `deepseek-v4-flash` | `deepseek-v4.1-flash` |
| `opencode-go` | `deepseek-v4-flash-vision-exp` | `deepseek-v4.1-flash` |
| `opencode-go` | `space-bunny-free` | `space-bunny`，会消耗 Go 用量额度 |

## 迁移

1. 在设置 → 模型中编辑 OpenCode 提供商，使用 **恢复默认模型** 从完整内置目录中选择。若保留自定义列表，则修改列表中的停用 ID，以及对应的 `modelOverrides` 键。
2. 清除针对旧版 OpenCode 官方端点设置的 `api` 或 `baseURL` 覆盖，使各模型继承自己的协议与端点。仅当自有代理支持所选模型的协议时保留相应代理设置。
3. 为受影响的代理或会话选择替代模型。确认提供商保存时没有目录诊断，且替代模型出现在模型选择器中。账户、地区和用量限制仍由 OpenCode 控制。
