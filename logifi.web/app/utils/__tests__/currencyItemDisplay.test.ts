import { describe, expect, it } from 'vitest'
import type { CurrencyStatus } from '../logbookTypes'
import {
  formatCurrencyChipLabel,
  formatCurrencyChipShortDeficit,
} from '../currencyItemDisplay'

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

  it('formatCurrencyChipShortDeficit for night takeoffs and landings', () => {
    expect(
      formatCurrencyChipShortDeficit(
        'night',
        status({ takeoffs: 0, landings: 0, isCurrent: false })
      )
    ).toBe('Night: 3 T/O + 3 ldg to go')
    expect(
      formatCurrencyChipShortDeficit(
        'night',
        status({ takeoffs: 2, landings: 3, isCurrent: false })
      )
    ).toBe('Night: 1 T/O to go')
  })

  it('formatCurrencyChipShortDeficit for IFR approaches', () => {
    expect(
      formatCurrencyChipShortDeficit(
        'instrument',
        status({ approaches: 4, isCurrent: false })
      )
    ).toBe('IFR: 2 appr to go')
  })

  it('formatCurrencyChipLabel keeps current chip copy', () => {
    expect(
      formatCurrencyChipLabel(
        'passenger',
        status({ isCurrent: true, status: 'current', takeoffs: 3, landings: 3 }),
        ref
      )
    ).toBe('90-day ✓ until Apr 12')
  })

  it('formatCurrencyChipLabel uses deficit instead of generic expired', () => {
    expect(
      formatCurrencyChipLabel(
        'night',
        status({ takeoffs: 1, landings: 1, isCurrent: false, status: 'expired' }),
        ref
      )
    ).toBe('Night: 2 T/O + 2 ldg to go')
  })

  it('formatCurrencyChipLabel keeps IFR IPC copy', () => {
    expect(
      formatCurrencyChipLabel(
        'instrument',
        status({ needsIpc: true, isCurrent: false, status: 'expired' }),
        ref
      )
    ).toBe('IFR expired, needs IPC')
  })
})