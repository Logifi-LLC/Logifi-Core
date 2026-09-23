import { describe, expect, it } from 'vitest'
import { resolveDigifiSpreadYear } from '~/utils/digifiSpreadYear'

describe('resolveDigifiSpreadYear', () => {
  it('rolls Dec 31 → Jan 6 to defaultYear + 1', () => {
    expect(resolveDigifiSpreadYear(1, 6, 2023, '2023-12-31')).toBe(2024)
  })

  it('keeps duplicate Jan 31 on locked year', () => {
    expect(resolveDigifiSpreadYear(1, 31, 2023, '2023-01-31')).toBe(2023)
  })

  it('keeps the same year when month/day matches the previous line', () => {
    expect(resolveDigifiSpreadYear(1, 31, 2023, '2024-01-31')).toBe(2023)
    expect(resolveDigifiSpreadYear(1, 31, 2023, '2023-01-31')).toBe(2023)
  })

  it('does not carry an OCR-inflated year into February on a locked spread', () => {
    expect(resolveDigifiSpreadYear(2, 1, 2023, '2024-01-31')).toBe(2023)
  })

  it('does not roll mid-month backtracks', () => {
    expect(resolveDigifiSpreadYear(9, 8, 2026, '2026-09-30')).toBe(2026)
  })

  it('continues January rows in the rolled year after Dec→Jan', () => {
    expect(resolveDigifiSpreadYear(1, 8, 2023, '2024-01-06')).toBe(2024)
  })
})
