import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CurrencyGroupList from '../../app/components/logbook/CurrencyGroupList.vue'
import type { CurrencyStatus, PassengerCurrencyGroup } from '../../app/utils/logbookTypes'

function status(partial: Partial<CurrencyStatus>): CurrencyStatus {
  return {
    isCurrent: false,
    daysRemaining: 0,
    expirationDate: new Date(2024, 3, 12, 12),
    status: 'expired',
    qualifyingEntries: [],
    takeoffs: 0,
    landings: 0,
    ...partial,
  }
}

function group(partial: Partial<PassengerCurrencyGroup>): PassengerCurrencyGroup {
  return {
    kind: 'category_class',
    key: 'ASEL',
    label: 'ASEL',
    passenger: status({ isCurrent: true, status: 'current', takeoffs: 3, landings: 3 }),
    night: status({ takeoffs: 0, landings: 0 }),
    ...partial,
  }
}

describe('CurrencyGroupList', () => {
  it('lists category/class rows and expands types when a type is not current', () => {
    const wrapper = mount(CurrencyGroupList, {
      props: {
        categoryClassGroups: [
          group({ key: 'ASEL', label: 'ASEL' }),
          group({
            key: 'AMEL',
            label: 'AMEL',
            passenger: status({ takeoffs: 1, landings: 1, status: 'expired' }),
          }),
        ],
        typeGroups: [
          group({
            kind: 'type',
            key: 'E170',
            label: 'E170',
            passenger: status({ takeoffs: 0, landings: 0, status: 'expired' }),
          }),
        ],
        side: 'passenger',
        isDarkMode: false,
        getStatusBadgeColor: () => 'bg-gray-200 text-gray-800',
        getStatusText: (s) => (s === 'current' ? 'Current' : 'Expired'),
        formatDate: () => 'Apr 12',
      },
    })

    expect(wrapper.text()).toContain('ASEL')
    expect(wrapper.text()).toContain('AMEL')
    expect(wrapper.text()).toContain('3/3 takeoffs')
    expect(wrapper.text()).toContain('1/3 landings')
    const details = wrapper.get('details')
    expect(details.attributes('open')).toBeDefined()
    expect(wrapper.text()).toContain('E170')
    wrapper.unmount()
  })
})
