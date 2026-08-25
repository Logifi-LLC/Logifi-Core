import { describe, expect, it } from 'vitest'
import { localCalendarYmd } from '../localCalendarDate'

describe('localCalendarYmd', () => {
  it('formats the environment-local calendar date, not UTC ISO', () => {
    const d = new Date(2026, 7, 25, 22, 15, 0)
    expect(localCalendarYmd(d)).toBe('2026-08-25')
  })
})
