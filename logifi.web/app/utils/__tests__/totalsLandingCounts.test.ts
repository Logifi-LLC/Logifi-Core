import { describe, it, expect } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import {
  sumLandingCountsFromEntries,
  filterEntriesByTotalsDateRange,
  normalizeSavedTotalsMetricKeys,
} from '../totalsLandingCounts'

function fictionalEntry(
  overrides: Partial<LogEntry> & { date: string }
): Pick<LogEntry, 'date' | 'performance'> {
  return {
    date: overrides.date,
    performance: {
      dayTakeoffs: null,
      dayLandings: null,
      nightTakeoffs: null,
      nightLandings: null,
      approachCount: null,
      holdingProcedures: null,
      ...overrides.performance,
    },
  }
}

describe('totalsLandingCounts', () => {
  describe('sumLandingCountsFromEntries', () => {
    it('sums landings and treats missing performance fields as 0', () => {
      const entries = [
        fictionalEntry({
          date: '2024-06-01',
          performance: { dayLandings: 2, nightLandings: 1 },
        }),
        fictionalEntry({ date: '2024-06-02' }),
        fictionalEntry({
          date: '2024-06-03',
          performance: { dayLandings: 1, nightLandings: undefined as unknown as null },
        }),
      ]

      expect(sumLandingCountsFromEntries(entries)).toEqual({
        dayLandings: 3,
        nightLandings: 1,
        totalLandings: 4,
      })
    })
  })

  describe('filterEntriesByTotalsDateRange', () => {
    const entries = [
      fictionalEntry({ date: '2024-01-10', performance: { dayLandings: 1 } }),
      fictionalEntry({ date: '2024-02-15', performance: { dayLandings: 2 } }),
      fictionalEntry({ date: '2024-03-20', performance: { dayLandings: 3 } }),
    ]

    it('returns all entries when range is null', () => {
      expect(sumLandingCountsFromEntries(filterEntriesByTotalsDateRange(entries, null))).toEqual({
        dayLandings: 6,
        nightLandings: 0,
        totalLandings: 6,
      })
    })

    it('sums only entries inside the selected window', () => {
      const range = {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-28T23:59:59.999'),
      }
      const filtered = filterEntriesByTotalsDateRange(entries, range)
      expect(sumLandingCountsFromEntries(filtered)).toEqual({
        dayLandings: 2,
        nightLandings: 0,
        totalLandings: 2,
      })
    })
  })

  describe('normalizeSavedTotalsMetricKeys', () => {
    const valid = new Set([
      'totalTime',
      'picTime',
      'totalLandings',
      'dayLandings',
      'nightLandings',
    ])

    it('drops unknown keys and keeps totalTime first', () => {
      expect(
        normalizeSavedTotalsMetricKeys(
          ['picTime', 'futureMetric', 'totalTime', 'dayLandings'],
          valid
        )
      ).toEqual(['totalTime', 'picTime', 'dayLandings'])
    })

    it('returns null when no valid keys remain', () => {
      expect(normalizeSavedTotalsMetricKeys(['obsoleteOnly'], valid)).toBeNull()
    })
  })
})
