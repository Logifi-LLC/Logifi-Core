import { describe, expect, it } from 'vitest'
import type { CurrencyStatus } from '../logbookTypes'
import { formatCurrencyChipForChips } from '../currencyItemDisplay'

function status(partial: Partial<CurrencyStatus>): CurrencyStatus {
  return {
    isCurrent: false,
    expirationDate: new Date('2026-04-12T12:00:00'),
    status: 'expired',
    qualifyingEntries: [],
    ...partial,
  }
}

describe('currencyItemDisplay', () => {
  const ref = new Date('2026-03-01T12:00:00')

  it('compact night deficit with middle dot', () => {
    const display = formatCurrencyChipForChips(
      'night',
      status({ takeoffs: 0, landings: 0, isCurrent: false }),
      ref
    )
    expect(display.label).toBe('Night: 3 T/O · 3 ldg')
    expect(display.title).toMatch(/Needs 3 more takeoffs/)
  })

  it('single-axis deficit stays one fragment', () => {
    expect(
      formatCurrencyChipForChips(
        'night',
        status({ takeoffs: 2, landings: 3, isCurrent: false }),
        ref
      ).label
    ).toBe('Night: 1 T/O')
  })

  it('IFR approach deficit is short with title', () => {
    const display = formatCurrencyChipForChips(
      'instrument',
      status({ approaches: 4, isCurrent: false }),
      ref
    )
    expect(display.label).toBe('IFR: 2 appr')
    expect(display.title).toBe('Needs 2 more approaches')
  })

  it('keeps current chip copy when short', () => {
    expect(
      formatCurrencyChipForChips(
        'passenger',
        status({ isCurrent: true, status: 'current', takeoffs: 3, landings: 3 }),
        ref
      ).label
    ).toBe('90-day ✓ until Apr 12')
  })

  it('IFR IPC uses short chip and full title', () => {
    const display = formatCurrencyChipForChips(
      'instrument',
      status({ needsIpc: true, isCurrent: false, status: 'expired' }),
      ref
    )
    expect(display.label).toBe('IFR: IPC')
    expect(display.title).toBe('IFR expired, needs IPC')
  })
})