import { describe, expect, it } from 'vitest'
import { shouldUseStackedLogbookCards } from '../../app/utils/logbookListLayout'

describe('shouldUseStackedLogbookCards', () => {
  it('always uses cards on iOS, including wide viewports', () => {
    expect(shouldUseStackedLogbookCards(true, false)).toBe(true)
    expect(shouldUseStackedLogbookCards(true, true)).toBe(true)
  })

  it('uses cards on web below 768px and the table at 768+', () => {
    expect(shouldUseStackedLogbookCards(false, true)).toBe(true)
    expect(shouldUseStackedLogbookCards(false, false)).toBe(false)
  })
})
