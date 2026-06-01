import { describe, it, expect } from 'vitest'
import { buildDigifiModelChain } from '../../server/utils/digifiEnv'

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
