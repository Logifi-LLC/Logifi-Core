import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildDigifiModelChain,
  buildDigifiThinkingConfig,
  inferDigifiProvider,
  isDigifiConfigured,
  normalizeDigifiModelId,
  resolveDigifiThinkingLevel,
  shouldTryNextDigifiModel,
} from '../../server/utils/digifiEnv'

describe('buildDigifiModelChain', () => {
  it('puts primary first and dedupes fallbacks', () => {
    expect(
      buildDigifiModelChain(
        'gemini-3.5-flash',
        ['gemini-3-flash-preview', 'gemini-3.5-flash'],
        ['gemini-3.1-flash-lite', 'gemini-3-flash-preview']
      )
    ).toEqual(['gemini-3.5-flash', 'gemini-3-flash-preview'])
  })

  it('uses defaults when no configured fallbacks', () => {
    expect(
      buildDigifiModelChain('gemini-3.1-pro', [], ['gemini-3.5-flash', 'gemini-3-flash-preview'])
    ).toEqual(['gemini-3.1-pro', 'gemini-3.5-flash', 'gemini-3-flash-preview'])
  })

  it('default capacity fallback chain is 3.5 flash then 3 flash preview', () => {
    expect(
      buildDigifiModelChain('gemini-3.5-flash', [], ['gemini-3-flash-preview'])
    ).toEqual(['gemini-3.5-flash', 'gemini-3-flash-preview'])
  })

  it('normalizes legacy Pro ids to 3.5 flash', () => {
    expect(normalizeDigifiModelId('gemini-3.1-pro')).toBe('gemini-3.5-flash')
    expect(normalizeDigifiModelId('gemini-3.1-pro-preview')).toBe('gemini-3.5-flash')
    expect(normalizeDigifiModelId('gemini-3.5-flash')).toBe('gemini-3.5-flash')
  })
})

describe('inferDigifiProvider', () => {
  it('detects anthropic from claude model ids', () => {
    expect(inferDigifiProvider('claude-3-5-sonnet-20241022')).toBe('anthropic')
    expect(inferDigifiProvider('claude-3.5-sonnet')).toBe('anthropic')
  })

  it('defaults to gemini for non-claude models', () => {
    expect(inferDigifiProvider('gemini-3.5-flash')).toBe('gemini')
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
})

describe('buildDigifiThinkingConfig', () => {
  it('uses thinkingLevel low for Gemini 3.5 Flash (REST thinkingConfig)', () => {
    expect(buildDigifiThinkingConfig('gemini-3.5-flash', 'low')).toEqual({
      thinkingLevel: 'low',
    })
  })

  it('uses thinkingLevel for other Gemini 3.x models', () => {
    expect(buildDigifiThinkingConfig('gemini-3-flash-preview', 'low')).toEqual({
      thinkingLevel: 'low',
    })
  })

  it('uses thinkingBudget 0 for Gemini 2.5 (no thinkingLevel)', () => {
    expect(buildDigifiThinkingConfig('gemini-2.5-flash', 'low')).toEqual({
      thinkingBudget: 0,
    })
  })
})

describe('isDigifiConfigured', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
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

  it('requires gemini key for gemini models', () => {
    process.env.NUXT_DIGIFI_MODEL = 'gemini-3.5-flash'
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
