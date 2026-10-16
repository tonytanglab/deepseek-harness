import { afterEach, describe, expect, it } from 'vitest'
import { normalizeContext } from '@earendil-works/pi-ai/utils/transcript'
import { catalogModels } from '../src/catalog.ts'
import { resolveProfiles } from '../src/config.ts'
import { discoverModels } from '../src/discovery.ts'
import { openCodeCatalog } from '../src/opencode-catalog.ts'
import { anthropicTextEvents, closeMockServers, mockServer, textEvents } from './mock-server.ts'

afterEach(closeMockServers)

const FREE_MODELS = [
  'big-pickle', 'deepseek-v4.1-flash-free', 'space-bunny-free', 'cat-jam-free',
  'longcat-2.5-preview-free', 'exo-free', 'mimo-v2.6-flash-free', 'mimo-v2.5-free',
  'nemotron-3-ultra-free', 'nemotron-3.5-lightning-free', 'nemotron-3.5-super-vl-free',
  'muse-spark-1.3-contributor-free',
]

const GO_MODELS = [
  'grok-4.7', 'grok-4.6', 'glm-5.3-flash', 'glm-5.3', 'glm-5.2', 'gpt-6-luna',
  'gpt-5.6-luna', 'claude-haiku-5-5', 'gemini-4-argon-contributor', 'kimi-k3',
  'kimi-k2.7-code', 'kimi-k2.6', 'longcat-2.0', 'longcat-2.5-preview-free',
  'step-5-preview', 'cat-jam-free', 'mimo-v2.6-flash', 'mimo-v2.6-pro', 'mimo-v2.5',
  'mimo-v2.5-pro', 'minimax-m3', 'minimax-m2.7', 'muse-spark-1.3-contributor',
  'muse-spark-1.2-contributor', 'qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-plus',
  'deepseek-v4.1-flash', 'deepseek-v4-pro', 'hy4-preview', 'hy3', 'space-bunny',
]

describe('OpenCode catalogs', () => {
  it.each([
    ['opencode', FREE_MODELS], ['opencode-go', GO_MODELS],
  ] as const)('discovers and resolves the published %s models without protocol declarations', async (provider, ids) => {
    const discovered = await discoverModels({ provider })
    expect(discovered.map(model => model.id)).toEqual(expect.arrayContaining([...ids]))
    const resolved = resolveProfiles({ [provider]: { models: ids.map(id => ({ id })) } })
    expect(resolved.get(provider)?.piProvider?.getModels().map(model => model.id)).toEqual(ids)
  })

  it('keeps free pricing and the separate Responses protocol for Muse Spark', () => {
    const catalog = catalogModels('opencode')
    for (const id of FREE_MODELS) {
      expect(catalog.get(id)?.cost).toMatchObject({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
    }
    expect(catalog.get('muse-spark-1.3-contributor-free')).toMatchObject({ api: 'openai-responses' })
    expect(catalog.get('deepseek-v4.1-flash-free')).toMatchObject({ api: 'openai-completions' })
  })

  it('keeps Go models on their own protocol-specific endpoints', () => {
    const catalog = catalogModels('opencode-go')
    for (const [id, api, suffix] of [
      ['step-5-preview', 'openai-completions', 'openai/v1'],
      ['gemini-4-argon-contributor', 'google-generative-ai', 'google/v1beta'],
      ['claude-haiku-5-5', 'anthropic-messages', 'anthropic'],
      ['minimax-m2.7', 'anthropic-messages', 'anthropic'],
      ['grok-4.6', 'openai-responses', 'openai/v1'],
    ] as const) {
      expect(catalog.get(id)).toMatchObject({ api, baseUrl: `https://opencode.ai/inference/go/${suffix}` })
    }
  })

  it('preserves upstream metadata, unrelated providers, and explicit endpoint overrides', () => {
    const upstream = catalogModels('opencode').get('exo-free')!
    const replacement = { ...upstream, name: 'Upstream Exo', maxTokens: 8192 }
    expect(openCodeCatalog('opencode', [replacement]).find(model => model.id === 'exo-free')).toMatchObject(replacement)
    expect(openCodeCatalog('other', [replacement])).toEqual([replacement])
    expect(openCodeCatalog('opencode-go', [{ ...replacement, id: 'step-5-preview-free' }])
      .some(model => model.id === 'step-5-preview-free')).toBe(false)
    expect(openCodeCatalog('opencode', [{ ...replacement, api: 'future-api' }])[0]?.baseUrl).toBe(upstream.baseUrl)
    const resolved = resolveProfiles({
      opencode: { baseURL: 'https://proxy.example/v1', models: [{ id: 'deepseek-v4.1-flash-free' }] },
    })
    expect(resolved.get('opencode')?.piProvider?.getModels()[0]?.baseUrl).toBe('https://proxy.example/v1')
  })

  it('still rejects unknown model ids without an explicit protocol', () => {
    expect(() => resolveProfiles({ opencode: { models: [{ id: 'does-not-exist-free' }] } })).toThrow(/needs an api/)
  })

  it.each([
    {
      provider: 'opencode', id: 'deepseek-v4.1-flash-free', events: textEvents,
      path: '/inference/openai/v1/chat/completions',
    },
    {
      provider: 'opencode-go', id: 'step-5-preview', events: textEvents,
      path: '/inference/go/openai/v1/chat/completions',
    },
    {
      provider: 'opencode-go', id: 'minimax-m2.7', events: anthropicTextEvents,
      path: '/inference/go/anthropic/v1/messages?beta=true',
    },
    {
      provider: 'opencode-go', id: 'gemini-4-argon-contributor',
      events: [JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: 'hello' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1, totalTokenCount: 4 },
      })],
      path: '/inference/go/google/v1beta/models/gemini-4-argon-contributor:streamGenerateContent?alt=sse',
    },
  ])('streams $provider/$id through its catalog-owned API', async ({ provider, id, events, path }) => {
    const server = await mockServer([{ events }])
    const entry = catalogModels(provider).get(id)!
    const route = resolveProfiles({
      [provider]: { baseURL: `${server.url}${new URL(entry.baseUrl).pathname}`, models: [{ id }] },
    }).get(provider)!.piProvider!
    const stream = route.streamSimple(route.getModels()[0]!, normalizeContext({
      messages: [{ role: 'user', content: 'hi', timestamp: 0 }],
    }), { apiKey: 'test-key', sessionId: 'opencode-catalog-test' })
    const result = await stream.result()
    expect(result.stopReason).toBe('stop')
    expect(result.content).toContainEqual({ type: 'text', text: 'hello' })
    expect(server.paths).toEqual([path])
    expect(server.requests[0]).toMatchObject(id.startsWith('gemini-') ? {} : { model: id })
    expect(server.headers[0]?.['x-opencode-session']).toBe('opencode-catalog-test')
  })
})
