import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildDigifiModelChain,
  buildDigifiThinkingConfig,
  DEFAULT_GEMINI_DIGIFI_MODEL,
  DEFAULT_OPENROUTER_DIGIFI_MODEL,
  DEFAULT_OPENROUTER_PROVIDERS,
  getDigifiEnv,
  inferDigifiProvider,
  isDigifiConfigured,
  normalizeDigifiModelId,
  omitsDigifiGeminiSamplingParams,
  resolveDigifiThinkingLevel,
  resolveDigifiTransport,
  shouldTryNextDigifiModel,
} from '../../server/utils/digifiEnv'

describe('buildDigifiModelChain', () => {
  it('puts primary first and dedupes fallbacks', () => {
    expect(
      buildDigifiModelChain(
        'gemini-3.6-flash',
        ['gemini-3.5-flash', 'gemini-3.6-flash'],
        ['gemini-3.1-flash-lite', 'gemini-3.5-flash']
      )
    ).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
  })

  it('uses defaults when no configured fallbacks', () => {
    expect(
      buildDigifiModelChain('gemini-3.1-pro', [], ['gemini-3.5-flash'])
    ).toEqual(['gemini-3.1-pro', 'gemini-3.5-flash'])
  })

  it('default capacity fallback chain is 3.8 flash then 3.6 then 3.5 flash', () => {
    expect(
      buildDigifiModelChain(DEFAULT_GEMINI_DIGIFI_MODEL, [], ['gemini-3.6-flash', 'gemini-3.5-flash'])
    ).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'])
  })

  it('normalizes legacy Pro ids to 3.5 flash (not 3.6)', () => {
    expect(normalizeDigifiModelId('gemini-3.1-pro')).toBe('gemini-3.5-flash')
    expect(normalizeDigifiModelId('gemini-3.1-pro-preview')).toBe('gemini-3.5-flash')
    expect(normalizeDigifiModelId('gemini-3.5-flash')).toBe('gemini-3.5-flash')
    expect(normalizeDigifiModelId('gemini-3.6-flash')).toBe('gemini-3.6-flash')
  })
})

describe('omitsDigifiGeminiSamplingParams', () => {
  it('omits temperature for Gemini 3.6+ models', () => {
    expect(omitsDigifiGeminiSamplingParams('gemini-3.8-flash')).toBe(true)
    expect(omitsDigifiGeminiSamplingParams('gemini-3.6-flash')).toBe(true)
    expect(omitsDigifiGeminiSamplingParams('gemini-3.5-flash')).toBe(false)
    expect(omitsDigifiGeminiSamplingParams('gemini-3-flash-preview')).toBe(false)
  })

  it('also omits temperature for Gemini 3.7 models', () => {
    expect(omitsDigifiGeminiSamplingParams('gemini-3.7-flash')).toBe(true)
  })

  it('omits temperature for Gemini 4 ids the same way as 3.6+', () => {
    expect(omitsDigifiGeminiSamplingParams('gemini-4-hydrogen')).toBe(true)
    expect(omitsDigifiGeminiSamplingParams('google/gemini-4-hydrogen')).toBe(true)
    expect(omitsDigifiGeminiSamplingParams('gemini-3.5-flash')).toBe(false)
  })
})

describe('inferDigifiProvider', () => {
  it('detects anthropic from claude model ids', () => {
    expect(inferDigifiProvider('claude-3-5-sonnet-20241022')).toBe('anthropic')
    expect(inferDigifiProvider('claude-3.5-sonnet')).toBe('anthropic')
  })

  it('defaults to gemini for non-claude models', () => {
    expect(inferDigifiProvider('gemini-3.6-flash')).toBe('gemini')
  })
})

describe('normalizeDigifiModelId for Claude', () => {
  it('maps retired 3.5 Sonnet ids to current Sonnet', () => {
    expect(normalizeDigifiModelId('claude-3.5-sonnet')).toBe('claude-sonnet-4-6')
    expect(normalizeDigifiModelId('claude-3-5-sonnet')).toBe('claude-sonnet-4-6')
    expect(normalizeDigifiModelId('claude-3-5-sonnet-20241022')).toBe('claude-sonnet-4-6')
  })
})

describe('shouldTryNextDigifiModel', () => {
  it('only advances on capacity or config errors', () => {
    expect(shouldTryNextDigifiModel('CAPACITY')).toBe(true)
    expect(shouldTryNextDigifiModel('CONFIG')).toBe(true)
    expect(shouldTryNextDigifiModel('INVALID_RESPONSE')).toBe(false)
    expect(shouldTryNextDigifiModel('UNKNOWN')).toBe(false)
  })
})

describe('resolveDigifiThinkingLevel', () => {
  it('caps high and medium to low for OCR', () => {
    expect(resolveDigifiThinkingLevel('high')).toBe('low')
    expect(resolveDigifiThinkingLevel('medium')).toBe('low')
    expect(resolveDigifiThinkingLevel('minimal')).toBe('minimal')
  })

  it('clamps minimal to low for Gemini 3.7 (unsupported level)', () => {
    expect(resolveDigifiThinkingLevel('minimal', 'gemini-3.7-flash')).toBe('low')
  })

  it('keeps minimal as-is for Gemini 3.6 (supported)', () => {
    expect(resolveDigifiThinkingLevel('minimal', 'gemini-3.6-flash')).toBe('minimal')
  })

  it('still clamps high to low for Gemini 3.7', () => {
    expect(resolveDigifiThinkingLevel('high', 'gemini-3.7-flash')).toBe('low')
  })

  it('accepts xhigh and caps it to low with medium and high', () => {
    expect(resolveDigifiThinkingLevel('xhigh')).toBe('low')
    expect(resolveDigifiThinkingLevel('xhigh', 'gemini-4-hydrogen')).toBe('low')
    expect(resolveDigifiThinkingLevel('medium', 'gemini-4-hydrogen')).toBe('low')
    expect(resolveDigifiThinkingLevel('low', 'gemini-4-hydrogen')).toBe('low')
    expect(resolveDigifiThinkingLevel('minimal', 'gemini-4-hydrogen')).toBe('minimal')
  })
})

describe('buildDigifiThinkingConfig', () => {
  it('uses thinkingLevel low for Gemini 3.6 Flash (REST thinkingConfig)', () => {
    expect(buildDigifiThinkingConfig('gemini-3.6-flash', 'low')).toEqual({
      thinkingLevel: 'low',
    })
  })

  it('uses thinkingLevel for other Gemini 3.x models', () => {
    expect(buildDigifiThinkingConfig('gemini-3.5-flash', 'low')).toEqual({
      thinkingLevel: 'low',
    })
  })

  it('uses thinkingBudget 0 for Gemini 2.5 (no thinkingLevel)', () => {
    expect(buildDigifiThinkingConfig('gemini-2.5-flash', 'low')).toEqual({
      thinkingBudget: 0,
    })
  })

  it('uses thinkingLevel for Gemini 4 ids', () => {
    expect(buildDigifiThinkingConfig('gemini-4-hydrogen', 'low')).toEqual({
      thinkingLevel: 'low',
    })
    expect(buildDigifiThinkingConfig('google/gemini-4-hydrogen', 'low')).toEqual({
      thinkingLevel: 'low',
    })
  })
})

describe('getDigifiEnv enableRescueScan', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      geminiApiKey: '',
      anthropicApiKey: '',
      digifiModel: 'gemini-3.6-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('defaults rescue scan to enabled', () => {
    delete process.env.NUXT_DIGIFI_ENABLE_RESCUE_SCAN
    delete process.env.DIGIFI_ENABLE_RESCUE_SCAN
    expect(getDigifiEnv().enableRescueScan).toBe(true)
  })

  it('allows disabling rescue scan via env', () => {
    process.env.NUXT_DIGIFI_ENABLE_RESCUE_SCAN = 'false'
    expect(getDigifiEnv().enableRescueScan).toBe(false)
  })
})

describe('isDigifiConfigured', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      geminiApiKey: '',
      anthropicApiKey: '',
      digifiModel: 'gemini-3.6-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('requires gemini key for gemini models', () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.6-flash'
    process.env.GEMINI_API_KEY = 'test-gemini'
    delete process.env.ANTHROPIC_API_KEY
    expect(isDigifiConfigured()).toBe(true)

    delete process.env.GEMINI_API_KEY
    expect(isDigifiConfigured()).toBe(false)
  })

  it('requires anthropic key for claude models', () => {
    process.env.NUXT_DIGIFI_MODEL = 'claude-3-5-sonnet-20241022'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic'
    delete process.env.GEMINI_API_KEY
    expect(isDigifiConfigured()).toBe(true)

    delete process.env.ANTHROPIC_API_KEY
    expect(isDigifiConfigured()).toBe(false)
  })
})

describe('openrouter digifi env', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      geminiApiKey: '',
      anthropicApiKey: '',
      openrouterApiKey: '',
      digifiProvider: '',
      digifiOpenrouterModel: '',
      digifiOpenrouterProviders: '',
      digifiModel: 'gemini-3.8-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
    delete process.env.NUXT_DIGIFI_PROVIDER
    delete process.env.DIGIFI_PROVIDER
    delete process.env.NUXT_OPENROUTER_API_KEY
    delete process.env.OPENROUTER_API_KEY
    delete process.env.NUXT_DIGIFI_OPENROUTER_MODEL
    delete process.env.DIGIFI_OPENROUTER_MODEL
    delete process.env.NUXT_DIGIFI_OPENROUTER_PROVIDERS
    delete process.env.DIGIFI_OPENROUTER_PROVIDERS
    delete process.env.NUXT_DIGIFI_GEMINI_THINKING_LEVEL
    delete process.env.DIGIFI_GEMINI_THINKING_LEVEL
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('keeps direct Gemini when the provider flag is unset', () => {
    expect(resolveDigifiTransport('')).toBe('gemini')
    expect(resolveDigifiTransport('gemini')).toBe('gemini')
    const env = getDigifiEnv()
    expect(env.transport).toBe('gemini')
    expect(env.openrouterModel).toBe(DEFAULT_OPENROUTER_DIGIFI_MODEL)
    expect(env.openrouterProviders).toEqual([...DEFAULT_OPENROUTER_PROVIDERS])
  })

  it('selects openrouter, the model, and a custom provider list', () => {
    process.env.NUXT_DIGIFI_PROVIDER = 'OpenRouter'
    process.env.NUXT_DIGIFI_OPENROUTER_MODEL = 'google/gemini-4-hydrogen'
    process.env.NUXT_DIGIFI_OPENROUTER_PROVIDERS = 'google-ai-studio, other-studio'
    const env = getDigifiEnv()
    expect(env.transport).toBe('openrouter')
    expect(env.openrouterModel).toBe('google/gemini-4-hydrogen')
    expect(env.openrouterProviders).toEqual(['google-ai-studio', 'other-studio'])
  })

  it('stores xhigh before the OCR cap is applied', () => {
    process.env.NUXT_DIGIFI_GEMINI_THINKING_LEVEL = 'xhigh'
    expect(getDigifiEnv().geminiThinkingLevel).toBe('xhigh')
    process.env.NUXT_DIGIFI_GEMINI_THINKING_LEVEL = 'nope'
    expect(getDigifiEnv().geminiThinkingLevel).toBe('low')
  })

  it('treats an openrouter key or a gemini key as configured', () => {
    process.env.NUXT_DIGIFI_PROVIDER = 'openrouter'
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.8-flash'
    delete process.env.GEMINI_API_KEY
    process.env.NUXT_OPENROUTER_API_KEY = 'test-openrouter-key'
    expect(isDigifiConfigured()).toBe(true)

    delete process.env.NUXT_OPENROUTER_API_KEY
    process.env.GEMINI_API_KEY = 'test-gemini'
    expect(isDigifiConfigured()).toBe(true)

    delete process.env.GEMINI_API_KEY
    expect(isDigifiConfigured()).toBe(false)
  })
})
