import { describe, expect, it } from 'vitest'
import { localCalendarYmd, normalizeCalendarYmd } from '../localCalendarDate'

describe('localCalendarYmd', () => {
  it('formats the environment-local calendar date, not UTC ISO', () => {
    const d = new Date(2026, 7, 25, 22, 15, 0)
    expect(localCalendarYmd(d)).toBe('2026-08-25')
  })
})

describe('normalizeCalendarYmd', () => {
  it('keeps a calendar YYYY-MM-DD', () => {
    expect(normalizeCalendarYmd('2026-08-29')).toBe('2026-08-29')
  })

  it('strips an ISO datetime without converting UTC midnight to a local day', () => {
    expect(normalizeCalendarYmd('2026-08-29T00:00:00.000Z')).toBe('2026-08-29')
    expect(normalizeCalendarYmd('2026-09-02T04:00:00.000Z')).toBe('2026-09-02')
    expect(normalizeCalendarYmd('2026-08-29 06:05:00')).toBe('2026-08-29')
  })

  it('parses US and iOS display dates', () => {
    expect(normalizeCalendarYmd('08/29/2026')).toBe('2026-08-29')
    expect(normalizeCalendarYmd('Aug 29, 2026')).toBe('2026-08-29')
    expect(normalizeCalendarYmd('Sep 2, 2026')).toBe('2026-09-02')
  })

  it('returns null for empty or invalid input', () => {
    expect(normalizeCalendarYmd('')).toBeNull()
    expect(normalizeCalendarYmd('not a date')).toBeNull()
    expect(normalizeCalendarYmd('2026-13-40')).toBeNull()
  })
})
