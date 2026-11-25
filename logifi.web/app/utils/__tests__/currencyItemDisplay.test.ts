import { describe, expect, it } from 'vitest'
import type { CurrencyStatus } from '../logbookTypes'
import {
  buildCurrencyDisplayItems,
  formatCurrencyCurrentUntil,
  formatCurrencyNeedsLine,
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

  it('formatCurrencyCurrentUntil when current', () => {
    const line = formatCurrencyCurrentUntil(
      status({ isCurrent: true, status: 'current' }),
      ref
    )
    expect(line).toBe('Current until Apr 12')
  })

  it('formatCurrencyNeedsLine for passenger deficits', () => {
    expect(
      formatCurrencyNeedsLine(status({ takeoffs: 1, landings: 2 }), 'passenger')
    ).toBe('Needs 2 more takeoffs and 1 more landing')
  })

  it('formatCurrencyNeedsLine for instrument approaches', () => {
    expect(
      formatCurrencyNeedsLine(status({ approaches: 4, isCurrent: false }), 'instrument')
    ).toBe('Needs 2 more approaches')
  })

  it('buildCurrencyDisplayItems lists pooled currencies', () => {
    const items = buildCurrencyDisplayItems({
      passengerCurrency: status({ isCurrent: true, status: 'current', takeoffs: 3, landings: 3 }),
      nightCurrency: null,
      instrumentCurrency: null,
      flightReviewCurrency: null,
      referenceDate: ref,
    })
    expect(items).toHaveLength(1)
    expect(items[0]?.currentUntil).toMatch(/^Current until/)
    expect(items[0]?.needsLine).toBeNull()
  })
})