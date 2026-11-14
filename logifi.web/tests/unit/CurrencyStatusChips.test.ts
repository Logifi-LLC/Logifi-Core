import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CurrencyStatusChips from '../../app/components/logbook/CurrencyStatusChips.vue'
import type { CurrencyStatus } from '../../app/utils/logbookTypes'

function status(partial: Partial<CurrencyStatus> = {}): CurrencyStatus {
  return {
    isCurrent: true,
    daysRemaining: 60,
    expirationDate: new Date(2026, 3, 12, 12),
    status: 'current',
    qualifyingEntries: [],
    ...partial,
  }
}

describe('CurrencyStatusChips', () => {
  it('stays four compact chips and uses the #169 neutral empty-history state', () => {
    const withHistory = mount(CurrencyStatusChips, {
      props: {
        passengerCurrency: status(),
        nightCurrency: status(),
        instrumentCurrency: status(),
        flightReviewCurrency: status(),
        isDarkMode: false,
      },
    })
    expect(withHistory.findAll('button')).toHaveLength(4)
    withHistory.unmount()

    const thinBook = mount(CurrencyStatusChips, {
      props: {
        passengerCurrency: status({ isCurrent: false, status: 'expired' }),
        nightCurrency: status({ isCurrent: false, status: 'expired' }),
        instrumentCurrency: status({ isCurrent: false, status: 'expired' }),
        flightReviewCurrency: status({ isCurrent: false, status: 'missing' }),
        isDarkMode: false,
        insufficientHistory: true,
      },
    })
    const buttons = thinBook.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.text()).toBe('Add more flights to track currency')
    thinBook.unmount()
  })
})
