import { describe, it, expect } from 'vitest'
import { buildDigifiModelChain } from '../../server/utils/digifiEnv'

describe('buildDigifiModelChain', () => {
  it('puts primary first and dedupes fallbacks', () => {
    expect(
      buildDigifiModelChain(
        'gemini-3.5-flash',
        ['gemini-2.5-flash', 'gemini-3.5-flash'],
        ['gemini-2.0-flash', 'gemini-2.5-flash']
      )
    ).toEqual(['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'])
  })

  it('uses defaults when no configured fallbacks', () => {
    expect(
      buildDigifiModelChain('gemini-3.1-pro', [], ['gemini-2.5-pro', 'gemini-2.5-flash'])
    ).toEqual(['gemini-3.1-pro', 'gemini-2.5-pro', 'gemini-2.5-flash'])
  })
})
