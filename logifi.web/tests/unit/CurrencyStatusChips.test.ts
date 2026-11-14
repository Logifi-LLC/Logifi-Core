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

  it('shows a green 90-day chip when at least one category/class is current', () => {
    const wrapper = mount(CurrencyStatusChips, {
      props: {
        passengerCurrency: status({ isCurrent: true, status: 'current' }),
        nightCurrency: status({ isCurrent: false, status: 'expired' }),
        instrumentCurrency: status(),
        flightReviewCurrency: status(),
        isDarkMode: false,
      },
    })
    const passengerButton = wrapper.findAll('button')[0]
    expect(passengerButton?.classes().join(' ')).toContain('bg-green-100')
    wrapper.unmount()
  })

  it('shows a red 90-day chip when every category/class group is expired', () => {
    const wrapper = mount(CurrencyStatusChips, {
      props: {
        passengerCurrency: status({ isCurrent: false, status: 'expired' }),
        nightCurrency: status(),
        instrumentCurrency: status(),
        flightReviewCurrency: status(),
        isDarkMode: false,
      },
    })
    const passengerButton = wrapper.findAll('button')[0]
    expect(passengerButton?.text()).toBe('90-day expired')
    expect(passengerButton?.classes().join(' ')).toContain('bg-red-100')
    wrapper.unmount()
  })

  it('shows the latest-expiry until date when all category/class groups are current', () => {
    const wrapper = mount(CurrencyStatusChips, {
      props: {
        passengerCurrency: status({
          isCurrent: true,
          status: 'current',
          expirationDate: new Date(2026, 5, 30, 12),
        }),
        nightCurrency: status(),
        instrumentCurrency: status(),
        flightReviewCurrency: status(),
        isDarkMode: false,
      },
    })
    expect(wrapper.findAll('button')[0]?.text()).toBe('90-day ✓ until Jun 30')
    wrapper.unmount()
  })
})
