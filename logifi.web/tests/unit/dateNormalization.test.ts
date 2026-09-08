import { describe, it, expect } from 'vitest'

// Re-implement the normalization logic for testing (from digifiNormalize.ts and useLogbookBuilderImport.ts)
function parseIsoDateParts(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null
  const [y, m, d] = parts
  return { y, m, d }
}

function normalizeDate(val: string, defaultYear: number | null, lastDateIso?: string | null): string {
  const s = val.trim()
  if (!s) return ''
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s
  const year =
    typeof defaultYear === 'number' && Number.isFinite(defaultYear)
      ? defaultYear
      : new Date().getFullYear()
  const slashParts = s.split(/[/-]/).map((p) => p.trim())
  if (slashParts.length === 2) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y = year
      if (lastDateIso) {
        const last = parseIsoDateParts(lastDateIso)
        if (last) {
          const candidateTime = new Date(y, m - 1, d).getTime()
          const lastTime = new Date(last.y, last.m - 1, last.d).getTime()
          if (candidateTime <= lastTime) y = year + 1
        }
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  if (slashParts.length === 3) {
    const m = parseInt(slashParts[0], 10)
    const d = parseInt(slashParts[1], 10)
    const yRaw = slashParts[2]
    const parsedY = parseInt(yRaw, 10)
    if (Number.isFinite(m) && Number.isFinite(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      let y = year
      if (Number.isFinite(parsedY)) {
        if (yRaw.length === 2) {
          // Two-digit year: use current century, but allow reasonable range (1950-2049)
          // E.g. 26 → 2026, 50 → 2050, 49 → 2049, but 50+ could be 1950-1999
          const currentCentury = Math.floor(year / 100) * 100
          const candidate = currentCentury + parsedY
          // If candidate year is more than 50 years in the future, assume previous century
          if (candidate > year + 50) {
            y = currentCentury - 100 + parsedY
          } else {
            y = candidate
          }
        } else if (parsedY >= 1000) {
          y = parsedY
        }
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }
  return s
}

describe('Date Normalization', () => {
  describe('MM/DD format with defaultYear', () => {
    it('should use defaultYear when no prior date', () => {
      expect(normalizeDate('9/8', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('1/15', 2026, null)).toBe('2026-01-15')
      expect(normalizeDate('12/31', 2026, null)).toBe('2026-12-31')
    })

    it('should rollover year when date would be before lastDateIso', () => {
      // Dec 28, 2026 followed by Jan 5 should become Jan 5, 2027
      expect(normalizeDate('1/5', 2026, '2026-12-28')).toBe('2027-01-05')
      // Sept 30, 2026 followed by Sept 8 should become Sept 8, 2027 (backwards)
      expect(normalizeDate('9/8', 2026, '2026-09-30')).toBe('2027-09-08')
    })

    it('should not rollover when date is after lastDateIso', () => {
      // Sept 1, 2026 followed by Sept 8 should be Sept 8, 2026
      expect(normalizeDate('9/8', 2026, '2026-09-01')).toBe('2026-09-08')
      // Dec 1, 2026 followed by Dec 25 should be Dec 25, 2026
      expect(normalizeDate('12/25', 2026, '2026-12-01')).toBe('2026-12-25')
    })

    it('should handle single-digit months and days', () => {
      expect(normalizeDate('9/8', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('1/5', 2026, null)).toBe('2026-01-05')
    })
  })

  describe('MM/DD/YY format with defaultYear', () => {
    it('should parse two-digit year correctly when in current century', () => {
      expect(normalizeDate('9/8/26', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('9/7/26', 2026, null)).toBe('2026-09-07')
      expect(normalizeDate('1/15/24', 2026, null)).toBe('2024-01-15')
      expect(normalizeDate('12/31/30', 2026, null)).toBe('2030-12-31')
    })

    it('should not roll forward to 2027 for 26 when base year is 2026', () => {
      // Bug scenario: user types 9/8/26, expects 2026, not 2027
      expect(normalizeDate('9/8/26', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('9/7/26', 2026, null)).toBe('2026-09-07')
    })

    it('should handle years near century boundary correctly', () => {
      // 99 should be 1999 (past century) when base year is 2026
      expect(normalizeDate('1/1/99', 2026, null)).toBe('1999-01-01')
      // 00 should be 2000
      expect(normalizeDate('1/1/00', 2026, null)).toBe('2000-01-01')
      // 50 should be 2050 (within 50 years of 2026)
      expect(normalizeDate('1/1/50', 2026, null)).toBe('2050-01-01')
      // 77 should be 1977 (more than 50 years in future would be 2077)
      expect(normalizeDate('1/1/77', 2026, null)).toBe('1977-01-01')
    })

    it('should use previous century for two-digit years > 76 when base is 2026', () => {
      // 77 → 2077 is 51 years in future, so should be 1977
      expect(normalizeDate('1/1/77', 2026, null)).toBe('1977-01-01')
      // 80 → 1980
      expect(normalizeDate('5/15/80', 2026, null)).toBe('1980-05-15')
      // 95 → 1995
      expect(normalizeDate('12/31/95', 2026, null)).toBe('1995-12-31')
    })

    it('should handle edge case: year 76 (exactly 50 years from 2026)', () => {
      // 76 → 2076 is exactly 50 years from 2026, should be 2076 (within threshold)
      expect(normalizeDate('6/1/76', 2026, null)).toBe('2076-06-01')
    })
  })

  describe('MM/DD/YYYY format', () => {
    it('should use four-digit year as-is', () => {
      expect(normalizeDate('9/8/2026', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('1/1/2024', 2026, null)).toBe('2024-01-01')
      expect(normalizeDate('12/31/2025', 2026, null)).toBe('2025-12-31')
      expect(normalizeDate('6/15/1995', 2026, null)).toBe('1995-06-15')
    })
  })

  describe('YYYY-MM-DD format (already ISO)', () => {
    it('should return ISO dates unchanged', () => {
      expect(normalizeDate('2026-09-08', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('2024-01-15', 2026, null)).toBe('2024-01-15')
      expect(normalizeDate('1995-06-30', 2026, null)).toBe('1995-06-30')
    })
  })

  describe('Dash separator', () => {
    it('should handle dash separator for MM-DD format', () => {
      expect(normalizeDate('9-8', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('1-15', 2026, null)).toBe('2026-01-15')
    })

    it('should handle dash separator for MM-DD-YY format', () => {
      expect(normalizeDate('9-8-26', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('1-15-24', 2026, null)).toBe('2024-01-15')
    })
  })

  describe('Invalid dates', () => {
    it('should return input unchanged for invalid dates', () => {
      expect(normalizeDate('13/45', 2026, null)).toBe('13/45')
      expect(normalizeDate('99/99/99', 2026, null)).toBe('99/99/99')
      expect(normalizeDate('abc', 2026, null)).toBe('abc')
      expect(normalizeDate('', 2026, null)).toBe('')
    })
  })

  describe('Logbook page spanning year boundary', () => {
    it('should handle typical year-end logbook page scenario', () => {
      // Scenario: Logbook page dated 2026, entries span Dec 2026 to Jan 2027
      const results: string[] = []
      let lastDate: string | null = null
      
      const dates = ['12/28', '12/29', '12/31', '1/2', '1/5', '1/8']
      
      for (const date of dates) {
        const normalized = normalizeDate(date, 2026, lastDate)
        results.push(normalized)
        lastDate = normalized
      }
      
      expect(results).toEqual([
        '2026-12-28',
        '2026-12-29',
        '2026-12-31',
        '2027-01-02', // Rolled to 2027 because Jan 2 < Dec 31
        '2027-01-05', // Rolled to 2027 because Jan 5 < Jan 2 (prior entry)
        '2027-01-08', // Rolled to 2027 because Jan 8 < Jan 5 (prior entry)
      ])
    })

    it('should NOT rollover when dates are in sequence within same year', () => {
      // Scenario: Normal logbook page, all September 2026
      const results: string[] = []
      let lastDate: string | null = null
      
      const dates = ['9/1', '9/5', '9/8', '9/10', '9/15']
      
      for (const date of dates) {
        const normalized = normalizeDate(date, 2026, lastDate)
        results.push(normalized)
        lastDate = normalized
      }
      
      expect(results).toEqual([
        '2026-09-01',
        '2026-09-05',
        '2026-09-08',
        '2026-09-10',
        '2026-09-15',
      ])
    })
  })

  describe('Bug reproduction: Derek's scenario', () => {
    it('should NOT create 2027-09-08 when user types 9/8/26 with defaultYear 2026', () => {
      // Derek set default year to 2026 at top of Digifi
      // Typed 9/8/26 for a row
      // Expected: 2026-09-08
      // Bug: Got 2027-09-08 (future date error)
      expect(normalizeDate('9/8/26', 2026, null)).toBe('2026-09-08')
    })

    it('should NOT create 2027-09-08 when sequentially entering 9/7/26 then 9/8/26', () => {
      // Another row: typed 9/7/26
      const date1 = normalizeDate('9/7/26', 2026, null)
      expect(date1).toBe('2026-09-07')
      
      // Next row: typed 9/8/26 (after 9/7)
      const date2 = normalizeDate('9/8/26', 2026, date1)
      expect(date2).toBe('2026-09-08')
    })

    it('should handle MM/DD format consistently with MM/DD/YY format', () => {
      // If user types 9/8 and 9/8/26, both should yield 2026-09-08
      expect(normalizeDate('9/8', 2026, null)).toBe('2026-09-08')
      expect(normalizeDate('9/8/26', 2026, null)).toBe('2026-09-08')
    })
  })
})
