import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { inferDigifiProvider } from '../../server/utils/digifiEnv'
import { scanLogbookImage } from '../../server/utils/digifiExtractor'

vi.mock('../../server/utils/digifiGemini', () => ({
  scanLogbookImageWithGemini: vi.fn(async () => ({
    rows: [],
    modelUsed: 'gemini-3.6-flash',
    providerUsed: 'gemini',
    strategyUsed: 'page-overview',
    chunkCount: 0,
    rescueAttempted: false,
    rescueRecoveredCount: 0,
    duplicateRowIndices: [],
    fallbackUsed: false,
    modelsAttempted: ['gemini-3.6-flash'],
    apiCallCount: 1,
    timings: { primaryMs: 1, rescueMs: 0, totalMs: 1 },
  })),
}))

vi.mock('../../server/utils/digifiClaude', () => ({
  scanLogbookImageWithClaude: vi.fn(async () => ({
    rows: [],
    modelUsed: 'claude-3-5-sonnet-20241022',
    providerUsed: 'anthropic',
    strategyUsed: 'page-overview',
    chunkCount: 0,
    rescueAttempted: false,
    rescueRecoveredCount: 0,
    duplicateRowIndices: [],
    fallbackUsed: false,
    modelsAttempted: ['claude-3-5-sonnet-20241022'],
    apiCallCount: 1,
    timings: { primaryMs: 1, rescueMs: 0, totalMs: 1 },
  })),
}))

vi.mock('../../server/utils/digifiOpenRouter', () => ({
  scanLogbookImageWithOpenRouter: vi.fn(async () => ({
    rows: [],
    modelUsed: 'google/gemini-4-hydrogen',
    providerUsed: 'openrouter',
    strategyUsed: 'page-overview',
    chunkCount: 0,
    rescueAttempted: false,
    rescueRecoveredCount: 0,
    duplicateRowIndices: [],
    fallbackUsed: false,
    modelsAttempted: ['google/gemini-4-hydrogen'],
    apiCallCount: 1,
    timings: { primaryMs: 1, rescueMs: 0, totalMs: 1 },
  })),
}))

import { scanLogbookImageWithGemini } from '../../server/utils/digifiGemini'
import { scanLogbookImageWithClaude } from '../../server/utils/digifiClaude'
import { scanLogbookImageWithOpenRouter } from '../../server/utils/digifiOpenRouter'

describe('inferDigifiProvider', () => {
  it('routes claude models to anthropic', () => {
    expect(inferDigifiProvider('claude-3-5-sonnet-20241022')).toBe('anthropic')
  })
})

describe('scanLogbookImage factory', () => {
  const originalEnv = { ...process.env }
  const scanOptions = {
    imageBase64: 'abc',
    mimeType: 'image/jpeg',
    meta: {
      spreadId: '00000000-0000-4000-8000-000000000001',
      pageSide: 'left' as const,
      layout: 'single' as const,
      rowCount: 5,
      twoPageSplitIndex: 1,
      defaultYear: 2024,
      columns: [
        {
          id: 'date',
          label: 'Date',
          fieldKey: 'date' as const,
          order: 0,
        },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useRuntimeConfig', () => ({
      geminiApiKey: '',
      anthropicApiKey: '',
      openrouterApiKey: '',
      digifiProvider: '',
      digifiOpenrouterModel: '',
      digifiOpenrouterProviders: '',
      digifiModel: 'gemini-3.6-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
    delete process.env.NUXT_DIGIFI_PROVIDER
    delete process.env.DIGIFI_PROVIDER
    delete process.env.NUXT_OPENROUTER_API_KEY
    delete process.env.OPENROUTER_API_KEY
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('calls Gemini adapter when model is gemini and key is set', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.6-flash'
    process.env.GEMINI_API_KEY = 'test-gemini'
    delete process.env.ANTHROPIC_API_KEY

    const result = await scanLogbookImage(scanOptions)
    expect(scanLogbookImageWithGemini).toHaveBeenCalledOnce()
    expect(scanLogbookImageWithClaude).not.toHaveBeenCalled()
    expect(scanLogbookImageWithOpenRouter).not.toHaveBeenCalled()
    expect(result.providerUsed).toBe('gemini')
    expect(result.fallbackUsed).toBe(false)
  })

  it('calls Claude adapter when model is claude and key is set', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'claude-3-5-sonnet-20241022'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic'
    delete process.env.GEMINI_API_KEY

    const result = await scanLogbookImage(scanOptions)
    expect(scanLogbookImageWithClaude).toHaveBeenCalledOnce()
    expect(scanLogbookImageWithGemini).not.toHaveBeenCalled()
    expect(result.providerUsed).toBe('anthropic')
  })

  it('throws DIGIFI_NOT_CONFIGURED when anthropic key missing for claude model', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'claude-3-5-sonnet-20241022'
    delete process.env.ANTHROPIC_API_KEY

    await expect(scanLogbookImage(scanOptions)).rejects.toThrow('DIGIFI_NOT_CONFIGURED')
  })

  it('calls OpenRouter when the provider flag is set and the key is present', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.8-flash'
    process.env.NUXT_DIGIFI_PROVIDER = 'openrouter'
    process.env.NUXT_OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.GEMINI_API_KEY = 'test-gemini'

    const result = await scanLogbookImage(scanOptions)
    expect(scanLogbookImageWithOpenRouter).toHaveBeenCalledOnce()
    expect(scanLogbookImageWithGemini).not.toHaveBeenCalled()
    expect(result.providerUsed).toBe('openrouter')
  })

  it('falls back to Gemini when OpenRouter is selected but the key is missing', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.8-flash'
    process.env.NUXT_DIGIFI_PROVIDER = 'openrouter'
    process.env.GEMINI_API_KEY = 'test-gemini'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await scanLogbookImage(scanOptions)
    expect(scanLogbookImageWithOpenRouter).not.toHaveBeenCalled()
    expect(scanLogbookImageWithGemini).toHaveBeenCalledOnce()
    expect(result.providerUsed).toBe('gemini')
    expect(result.fallbackUsed).toBe(true)
    expect(warn.mock.calls.map((call) => call.join(' ')).join('\n')).toContain('API key missing')
    warn.mockRestore()
  })

  it('falls back to Gemini when OpenRouter errors and does not log the key', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.8-flash'
    process.env.NUXT_DIGIFI_PROVIDER = 'openrouter'
    process.env.NUXT_OPENROUTER_API_KEY = 'test-openrouter-key'
    process.env.GEMINI_API_KEY = 'test-gemini'
    vi.mocked(scanLogbookImageWithOpenRouter).mockRejectedValueOnce(
      new Error('OpenRouter API 500: test-openrouter-key leaked')
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await scanLogbookImage(scanOptions)
    expect(scanLogbookImageWithGemini).toHaveBeenCalledOnce()
    expect(result.fallbackUsed).toBe(true)
    expect(result.modelsAttempted[0]).toBe('google/gemini-4-hydrogen')
    const warning = warn.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(warning).toContain('falling back to Gemini')
    expect(warning).not.toContain('test-openrouter-key')
    expect(warning).toContain('[redacted]')
    warn.mockRestore()
  })
})
