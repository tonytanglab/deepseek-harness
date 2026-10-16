/**
 * OpenCode catalog corrections against the Console and Go endpoint tables:
 * https://opencode.ai/v2/docs/console/models/#endpoints
 * https://opencode.ai/v2/docs/console/go/#endpoints
 * Capacity and pricing metadata follows models.dev. pi-ai owns protocol implementations.
 */

import type { Api, Model } from '@earendil-works/pi-ai'

type CatalogEntry = Omit<Model<Api>, 'provider' | 'baseUrl'>

/** Models published by OpenCode but absent from pi-ai's bundled catalog. */
const ADDITIONS: Readonly<Record<'opencode' | 'opencode-go', readonly CatalogEntry[]>> = {
  opencode: [
    {
      id: 'exo-free', name: 'Exo Free', api: 'openai-completions', type: 'chat',
      reasoning: true, input: ['text', 'image'], contextWindow: 1_048_576, maxTokens: 131_072,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
    {
      id: 'mimo-v2.5-free', name: 'MiMo-V2.5 Free', api: 'openai-completions', type: 'chat',
      reasoning: true, input: ['text', 'image'], contextWindow: 200_000, maxTokens: 32_000,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
  ],
  'opencode-go': [
    {
      id: 'step-5-preview', name: 'Step 5 Preview', api: 'openai-completions', type: 'chat',
      reasoning: true, input: ['text', 'image'], contextWindow: 1_000_000, maxTokens: 65_536,
      cost: { input: 1, output: 2.7, cacheRead: 0.1, cacheWrite: 0 },
      compat: { supportsDeveloperRole: false, maxTokensField: 'max_tokens' },
    },
    {
      id: 'kimi-k2.6', name: 'Kimi K2.6', api: 'openai-completions', type: 'chat',
      reasoning: true, input: ['text', 'image'], contextWindow: 262_144, maxTokens: 65_536,
      cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
      compat: { thinkingFormat: 'deepseek', supportsReasoningEffort: false, maxTokensField: 'max_tokens' },
    },
    {
      id: 'minimax-m2.7', name: 'MiniMax M2.7', api: 'anthropic-messages', type: 'chat',
      reasoning: true, input: ['text'], contextWindow: 204_800, maxTokens: 131_072,
      cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
    },
    {
      id: 'grok-4.6', name: 'Grok 4.6', api: 'openai-responses', type: 'chat',
      reasoning: true, input: ['text', 'image'], contextWindow: 500_000, maxTokens: 500_000,
      cost: {
        input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0,
        tiers: [{ inputTokensAbove: 200_000, input: 4, output: 12, cacheRead: 1, cacheWrite: 0 }],
      },
      thinkingLevelMap: { off: null, minimal: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: null },
    },
  ],
}

/** Protocol-specific API roots published by OpenCode, relative to its inference service. */
const API_PATHS: Readonly<Record<string, string>> = {
  'openai-completions': 'openai/v1',
  'openai-responses': 'openai/v1',
  'anthropic-messages': 'anthropic',
  'google-generative-ai': 'google/v1beta',
}

/**
 * Complete OpenCode's bundled chat catalog and use its documented API roots.
 * Upstream metadata wins when an added model is included in a later pi-ai release.
 * Other providers retain their installed catalog unchanged.
 * @param provider - installed provider id.
 * @param models - installed chat models for that provider.
 * @returns models with OpenCode additions and protocol-specific endpoints.
 */
export function openCodeCatalog(provider: string, models: readonly Model<Api>[]): readonly Model<Api>[] {
  if (provider !== 'opencode' && provider !== 'opencode-go') return models
  const root = `https://opencode.ai/inference${provider === 'opencode-go' ? '/go' : ''}`
  const catalog = new Map(models.map(model => [model.id, model]))
  // The official endpoint table names the Go preview without a free suffix.
  catalog.delete('step-5-preview-free')
  for (const entry of ADDITIONS[provider]) {
    if (!catalog.has(entry.id)) catalog.set(entry.id, { ...entry, provider, baseUrl: root })
  }
  return [...catalog.values()].map((model) => {
    const path = API_PATHS[model.api]
    return path === undefined ? model : { ...model, baseUrl: `${root}/${path}` }
  })
}
