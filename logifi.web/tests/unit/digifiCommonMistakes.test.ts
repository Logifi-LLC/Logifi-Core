import { describe, it, expect } from 'vitest'
import {
  DIGIFI_COMMON_MISTAKE_CHECKLIST,
  DIGIFI_COMMON_MISTAKE_PROMPT_RULES,
} from '../../app/utils/digifiCommonMistakes'

describe('digifiCommonMistakes', () => {
  it('exports four checklist items', () => {
    expect(DIGIFI_COMMON_MISTAKE_CHECKLIST).toHaveLength(4)
    expect(DIGIFI_COMMON_MISTAKE_CHECKLIST.map((item) => item.id)).toEqual([
      'route',
      'landings',
      'instrument',
      'dual',
    ])
  })

  it('includes prompt rules for Gemini', () => {
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('Common mistakes to avoid')
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('Dual Given')
  })
})
