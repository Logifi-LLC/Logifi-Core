import { describe, it, expect } from 'vitest'
import {
  DIGIFI_COMMON_MISTAKE_CHECKLIST,
  DIGIFI_COMMON_MISTAKE_PROMPT_RULES,
} from '../../app/utils/digifiCommonMistakes'

describe('digifiCommonMistakes', () => {
  it('exports seven checklist items', () => {
    expect(DIGIFI_COMMON_MISTAKE_CHECKLIST).toHaveLength(7)
    expect(DIGIFI_COMMON_MISTAKE_CHECKLIST.map((item) => item.id)).toEqual([
      'totals',
      'remarks',
      'same-duration',
      'route',
      'landings',
      'instrument',
      'dual',
    ])
  })

  it('includes prompt rules for totals footer', () => {
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('totals')
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('carried forward')
  })

  it('includes prompt rules for remarks boundaries', () => {
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('ruled lines')
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('adjacent rows')
  })

  it('includes prompt rules for identical consecutive durations', () => {
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('identical total/PIC times')
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('three 1.3 lines')
  })

  it('includes prompt rules for Gemini', () => {
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('Common mistakes to avoid')
    expect(DIGIFI_COMMON_MISTAKE_PROMPT_RULES).toContain('Dual Given')
  })
})
