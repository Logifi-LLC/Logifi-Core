import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { inferDigifiProvider } from '../../server/utils/digifiEnv'
import { scanLogbookImage } from '../../server/utils/digifiExtractor'

vi.mock('../../server/utils/digifiGemini', () => ({
  scanLogbookImageWithGemini: vi.fn(async () => ({
    rows: [],
    modelUsed: 'gemini-3.5-flash',
    providerUsed: 'gemini',
    strategyUsed: 'page-overview',
    chunkCount: 0,
    rescueAttempted: false,
    rescueRecoveredCount: 0,
    duplicateRowIndices: [],
    fallbackUsed: false,
    modelsAttempted: ['gemini-3.5-flash'],
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

import { scanLogbookImageWithGemini } from '../../server/utils/digifiGemini'
import { scanLogbookImageWithClaude } from '../../server/utils/digifiClaude'

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
      digifiModel: 'gemini-3.5-flash',
      digifiModelFallbacks: '',
      digifiEnableCapacityModelFallback: '',
      digifiMaxScansPerDay: 10,
    }))
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('calls Gemini adapter when model is gemini and key is set', async () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.5-flash'
    process.env.GEMINI_API_KEY = 'test-gemini'
    delete process.env.ANTHROPIC_API_KEY

    const result = await scanLogbookImage(scanOptions)
    expect(scanLogbookImageWithGemini).toHaveBeenCalledOnce()
    expect(scanLogbookImageWithClaude).not.toHaveBeenCalled()
    expect(result.providerUsed).toBe('gemini')
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
})
