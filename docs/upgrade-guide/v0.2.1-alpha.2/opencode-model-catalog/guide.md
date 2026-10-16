---
kind: upgrade-guide
description: "OpenCode catalog synchronization removes retired model IDs and supplies protocol-specific endpoints for Console and Go models."
---

# OpenCode model catalog

English | [中文](guide.zh.md)

## Change

The built-in `opencode` and `opencode-go` catalogs follow OpenCode's published model lists. Saved `models` lists, `modelOverrides` keys, and selected model IDs that name a retired entry need an available replacement. Every current model supplies its own protocol and endpoint.

| Provider | Retired model ID | Replacement |
|---|---|---|
| `opencode` | `fledge-alpha-free` | Choose a current free model, such as `deepseek-v4.1-flash-free` |
| `opencode` | `ling-3.0-flash-fin-free` | Choose a current free model, such as `mimo-v2.6-flash-free` |
| `opencode` | `ling-3.1-flash-free` | Choose a current free model, such as `mimo-v2.6-flash-free` |
| `opencode-go` | `deepseek-v4-flash` | `deepseek-v4.1-flash` |
| `opencode-go` | `deepseek-v4-flash-vision-exp` | `deepseek-v4.1-flash` |
| `opencode-go` | `space-bunny-free` | `space-bunny`, which consumes Go usage allowance |

## Migration

1. In Settings → Models, edit the OpenCode provider and use **Restore default models** to select from the complete built-in catalog. If you maintain a custom list, replace retired IDs in that list and in any `modelOverrides` keys instead.
2. Clear an `api` or `baseURL` override intended for the old official OpenCode endpoint so each model inherits its own protocol and endpoint. Keep deliberate proxy settings only when the proxy serves the selected models' protocols.
3. Select the replacement model in affected agents or sessions. Confirm that the provider saves without a catalog diagnostic and that the replacement appears in the model picker. Account, regional, and usage restrictions remain controlled by OpenCode.
