import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import {
  CURRENCY_WINDOW_DAYS,
  countFlightEntriesForCurrency,
  hasInsufficientCurrencyHistory,
  MIN_FLIGHT_ENTRIES_FOR_CURRENCY_TRACKING,
} from '../currencyHistoryPolicy'

function flightEntry(date: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `e-${date}`,
    date,
    logbookType: 'flight',
    isVoid: false,
    flightTime: { total: 1.0 },
    ...overrides,
  } as LogEntry
}

describe('currencyHistoryPolicy', () => {
  const ref = new Date('2026-06-15T12:00:00Z')

  it('documents minimum entry count', () => {
    expect(MIN_FLIGHT_ENTRIES_FOR_CURRENCY_TRACKING).toBe(3)
    expect(CURRENCY_WINDOW_DAYS).toBe(90)
  })

  it('treats one flight as insufficient history', () => {
    const entries = [flightEntry('2026-06-10')]
    expect(countFlightEntriesForCurrency(entries)).toBe(1)
    expect(hasInsufficientCurrencyHistory(entries, ref)).toBe(true)
  })

  it('requires three flights and a 90-day span', () => {
    const entries = [
      flightEntry('2026-05-01'),
      flightEntry('2026-05-15'),
      flightEntry('2026-06-01'),
    ]
    expect(hasInsufficientCurrencyHistory(entries, ref)).toBe(true)

    const longHistory = [
      flightEntry('2026-02-01'),
      flightEntry('2026-03-01'),
      flightEntry('2026-04-01'),
    ]
    expect(hasInsufficientCurrencyHistory(longHistory, ref)).toBe(false)
  })

  it('ignores void and simulator-only rows', () => {
    const entries = [
      flightEntry('2026-01-01', { isVoid: true }),
      flightEntry('2026-02-01', {
        logbookType: 'simulator',
        flightTime: { total: 1, ffs: 1 },
      }),
    ]
    expect(countFlightEntriesForCurrency(entries)).toBe(0)
    expect(hasInsufficientCurrencyHistory(entries, ref)).toBe(true)
  })
})
