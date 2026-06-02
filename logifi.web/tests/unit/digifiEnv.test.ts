import { describe, it, expect } from 'vitest'
import { buildDigifiModelChain, buildDigifiThinkingConfig } from '../../server/utils/digifiEnv'

describe('buildDigifiModelChain', () => {
  it('puts primary first and dedupes fallbacks', () => {
    expect(
      buildDigifiModelChain(
        'gemini-3.5-flash',
        ['gemini-3-flash-preview', 'gemini-3.5-flash'],
        ['gemini-3.1-flash-lite', 'gemini-3-flash-preview']
      )
    ).toEqual(['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'])
  })

  it('uses defaults when no configured fallbacks', () => {
    expect(
      buildDigifiModelChain('gemini-3.1-pro', [], ['gemini-3.5-flash', 'gemini-3-flash-preview'])
    ).toEqual(['gemini-3.1-pro', 'gemini-3.5-flash', 'gemini-3-flash-preview'])
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
